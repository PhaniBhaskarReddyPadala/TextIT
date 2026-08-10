import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import CopyButton from './CopyButton';

// Auto-lock after 5 minutes of inactivity
const AUTO_LOCK_MS = 5 * 60 * 1000;

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Locked Item (after unlock) ───────────────────────────────────────────────
function LockedItemUnlocked({ item, onDelete }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unlockPw, setUnlockPw] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [err, setErr] = useState('');

  const reveal = async () => {
    if (!unlockPw) return;
    setLoading(true);
    setErr('');
    try {
      const res = await api.post(`/text/locked/${item.id}/unlock`, { unlockPassword: unlockPw });
      if (res.success) {
        setContent(res.data.content);
        setRevealed(true);
        setUnlockPw('');
      } else {
        setErr(res.message || 'Failed to decrypt');
      }
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="locked-item">
      <div className="locked-item-header">
        <span className="locked-item-title">{item.title || '(untitled)'}</span>
        <button className="btn-danger" onClick={() => onDelete(item.id)} title="Delete">×</button>
      </div>
      <div className="locked-item-meta">{formatDate(item.createdAt)}</div>
      {!revealed ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="password"
            placeholder="Unlock password to reveal"
            value={unlockPw}
            onChange={(e) => setUnlockPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && reveal()}
            style={{ flex: 1, minWidth: '160px' }}
          />
          <button className="btn btn-secondary" onClick={reveal} disabled={loading || !unlockPw}>
            {loading ? '…' : 'Reveal'}
          </button>
          {err && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{err}</span>}
        </div>
      ) : (
        <>
          <div className="locked-item-content">{content}</div>
          <div className="locked-item-actions">
            <CopyButton getText={content} />
            <button className="btn-ghost" onClick={() => setRevealed(false)}>Hide</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Add Locked Form ──────────────────────────────────────────────────────────
function AddLockedForm({ onAdded, onCancel }) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [unlockPw, setUnlockPw] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) { setError('Content is required'); return; }
    if (!unlockPw || unlockPw.length < 4) { setError('Unlock password must be at least 4 characters'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/text/locked', {
        content: content.trim(),
        title: title.trim(),
        unlockPassword: unlockPw,
        expiry,
      });
      if (res.success) {
        onAdded(res.data);
      } else {
        setError(res.message || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-locked-form">
      <h4>Add Locked Text</h4>
      {error && <div className="error-msg">{error}</div>}
      <div className="form-group">
        <label>Title (optional)</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. API Key" />
      </div>
      <div className="form-group">
        <label>Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Secret content…"
          rows={3}
        />
      </div>
      <div className="form-group">
        <label>Unlock Password</label>
        <input
          type="password"
          value={unlockPw}
          onChange={(e) => setUnlockPw(e.target.value)}
          placeholder="Min. 4 characters"
        />
        <div className="unlock-hint">
          This password encrypts your content. All locked texts share one password.
        </div>
      </div>
      <div className="form-group">
        <div className="expiry-row">
          <label style={{ margin: 0, textTransform: 'none', letterSpacing: 0 }}>Expires:</label>
          <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            <option value="never">Never</option>
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
          </select>
        </div>
      </div>
      <div className="add-locked-footer">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Locked'}
        </button>
      </div>
    </div>
  );
}

// ─── Main LockedSpace Component ───────────────────────────────────────────────
export default function LockedSpace() {
  // 'locked' | 'unlocking' | 'unlocked'
  const [state, setState] = useState('locked');
  const [unlockPw, setUnlockPw] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const autoLockTimer = useRef(null);

  const resetAutoLock = useCallback(() => {
    clearTimeout(autoLockTimer.current);
    autoLockTimer.current = setTimeout(() => {
      setState('locked');
      setItems([]);
      setPage(1);
      setShowAddForm(false);
    }, AUTO_LOCK_MS);
  }, []);

  useEffect(() => {
    return () => clearTimeout(autoLockTimer.current);
  }, []);

  const fetchItems = useCallback(async (pageNum = 1) => {
    setLoadingItems(true);
    try {
      const res = await api.get(`/text/locked?page=${pageNum}&limit=10`);
      if (res.success) {
        if (pageNum === 1) {
          setItems(res.data);
        } else {
          setItems((prev) => [...prev, ...res.data]);
        }
        setHasMore(res.pagination?.hasMore || false);
        setPage(pageNum);
      }
    } catch {
      // ignore
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const handleUnlock = async () => {
    if (!unlockPw) return;
    setUnlocking(true);
    setUnlockError('');
    try {
      const res = await api.post('/text/locked/verify-unlock', { unlockPassword: unlockPw });
      if (res.success) {
        setState('unlocked');
        setUnlockPw('');
        fetchItems(1);
        resetAutoLock();
      } else {
        setUnlockError(res.message || 'Incorrect password');
      }
    } catch {
      setUnlockError('Network error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/text/locked/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
    resetAutoLock();
  };

  const handleAdded = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    setShowAddForm(false);
    resetAutoLock();
  };

  const lock = () => {
    clearTimeout(autoLockTimer.current);
    setState('locked');
    setItems([]);
    setPage(1);
    setShowAddForm(false);
    setUnlockPw('');
    setUnlockError('');
  };

  // ── Render: Locked ────────────────────────────────────────────────────────
  if (state === 'locked') {
    return (
      <div>
        <div className="locked-header">
          <div className="locked-status">
            <span className="locked-icon">🔒</span>
            <span>Locked</span>
          </div>
          <button className="btn btn-secondary" onClick={() => setState('unlocking')}>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Unlocking ─────────────────────────────────────────────────────
  if (state === 'unlocking') {
    return (
      <div className="unlock-form">
        <p style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--muted)' }}>
          Enter unlock password
        </p>
        {unlockError && <div className="error-msg">{unlockError}</div>}
        <div className="form-group">
          <input
            type="password"
            value={unlockPw}
            onChange={(e) => setUnlockPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Unlock password"
            autoFocus
            id="unlock-password-input"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => { setState('locked'); setUnlockPw(''); setUnlockError(''); }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleUnlock} disabled={unlocking || !unlockPw} id="unlock-btn">
            {unlocking ? 'Verifying…' : 'Unlock'}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Unlocked ──────────────────────────────────────────────────────
  return (
    <div onClick={resetAutoLock}>
      <div className="locked-header">
        <div className="locked-status">
          <span className="locked-icon">🔓</span>
          <span>Unlocked</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddForm((v) => !v)}>
            + Add
          </button>
          <button className="btn-ghost" onClick={lock}>Lock</button>
        </div>
      </div>

      <div className="auto-lock-notice">Auto-locks after 5 minutes of inactivity.</div>

      {showAddForm && (
        <AddLockedForm onAdded={handleAdded} onCancel={() => setShowAddForm(false)} />
      )}

      {loadingItems && items.length === 0 && (
        <p className="loading-text">Loading…</p>
      )}

      {!loadingItems && items.length === 0 && (
        <div className="empty-state">
          <p>No locked texts yet.</p>
          <p>Click &quot;+ Add&quot; to store something privately.</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        {items.map((item) => (
          <LockedItemUnlocked key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </div>

      {hasMore && (
        <div className="load-more">
          <button
            className="btn btn-secondary"
            onClick={() => { fetchItems(page + 1); resetAutoLock(); }}
            disabled={loadingItems}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
