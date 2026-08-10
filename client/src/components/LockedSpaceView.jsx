import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import CopyButton from './CopyButton';

// Auto-lock after 5 minutes of inactivity
const AUTO_LOCK_MS = 5 * 60 * 1000;

function formatDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

// ─── Single locked text item (after space is unlocked) ────────────────────────
function LockedTextItem({ item, spaceId, lockKey, onDelete }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [err, setErr] = useState('');

  const reveal = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.texts.unlock(spaceId, item.id, lockKey);
      if (res.success) {
        setContent(res.data.content);
        setRevealed(true);
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
        <button
          className="btn-danger"
          onClick={() => onDelete(item.id)}
          title="Delete"
          aria-label="Delete text"
        >
          ×
        </button>
      </div>
      <div className="locked-item-meta">{formatDate(item.createdAt)}</div>

      {!revealed ? (
        <button
          className="btn btn-secondary"
          onClick={reveal}
          disabled={loading}
          style={{ fontSize: '12px', padding: '5px 12px' }}
        >
          {loading ? 'Decrypting…' : '👁 Reveal'}
        </button>
      ) : (
        <>
          <div className="locked-item-content">{content}</div>
          <div className="locked-item-actions">
            <CopyButton getText={content} />
            <button className="btn-ghost" onClick={() => setRevealed(false)}>
              Hide
            </button>
          </div>
        </>
      )}
      {err && (
        <span style={{ color: 'var(--danger)', fontSize: '12px', display: 'block', marginTop: '6px' }}>
          {err}
        </span>
      )}
    </div>
  );
}

// ─── Add locked text form ─────────────────────────────────────────────────────
function AddLockedForm({ spaceId, lockKey, onAdded, onCancel }) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.texts.create(spaceId, {
        content: content.trim(),
        title: title.trim(),
        lockKey,
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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. API Key"
        />
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
        <div className="expiry-row">
          <label style={{ margin: 0, textTransform: 'none', letterSpacing: 0 }}>
            Expires:
          </label>
          <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            <option value="never">Never</option>
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
          </select>
        </div>
      </div>
      <div className="add-locked-footer">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Locked'}
        </button>
      </div>
    </div>
  );
}

// ─── Main LockedSpaceView ─────────────────────────────────────────────────────
// Receives `space` prop: { id, name, isLocked, ... }
export default function LockedSpaceView({ space }) {
  // 'locked' | 'unlocking' | 'unlocked'
  const [status, setStatus] = useState('locked');
  const [lockKey, setLockKey] = useState(''); // the verified key held in memory
  const [inputKey, setInputKey] = useState('');
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
      setStatus('locked');
      setLockKey('');
      setItems([]);
      setPage(1);
      setShowAddForm(false);
    }, AUTO_LOCK_MS);
  }, []);

  useEffect(() => () => clearTimeout(autoLockTimer.current), []);

  const fetchItems = useCallback(
    async (pageNum = 1) => {
      setLoadingItems(true);
      try {
        const res = await api.texts.list(space.id, pageNum);
        if (res.success) {
          setItems((prev) => (pageNum === 1 ? res.data : [...prev, ...res.data]));
          setHasMore(res.pagination?.hasMore || false);
          setPage(pageNum);
        }
      } finally {
        setLoadingItems(false);
      }
    },
    [space.id]
  );

  const handleUnlock = async () => {
    if (!inputKey) return;
    setUnlocking(true);
    setUnlockError('');
    try {
      const res = await api.spaces.verifyLock(space.id, inputKey);
      if (res.success) {
        setLockKey(inputKey);
        setInputKey('');
        setStatus('unlocked');
        fetchItems(1);
        resetAutoLock();
      } else {
        setUnlockError(res.message || 'Incorrect lock key');
      }
    } catch {
      setUnlockError('Network error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDelete = async (textId) => {
    await api.texts.delete(space.id, textId);
    setItems((prev) => prev.filter((i) => i.id !== textId));
    resetAutoLock();
  };

  const handleAdded = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    setShowAddForm(false);
    resetAutoLock();
  };

  const lock = () => {
    clearTimeout(autoLockTimer.current);
    setStatus('locked');
    setLockKey('');
    setItems([]);
    setPage(1);
    setShowAddForm(false);
    setInputKey('');
    setUnlockError('');
  };

  // ── Locked view ────────────────────────────────────────────────────────────
  if (status === 'locked') {
    return (
      <div className="locked-gate">
        <div className="locked-gate-icon">🔒</div>
        <div className="locked-gate-title">{space.name}</div>
        <p className="locked-gate-sub">This space is protected by a lock key.</p>
        <button
          className="btn btn-primary"
          onClick={() => setStatus('unlocking')}
          id={`unlock-space-${space.id}`}
        >
          Unlock
        </button>
      </div>
    );
  }

  // ── Unlocking view ─────────────────────────────────────────────────────────
  if (status === 'unlocking') {
    return (
      <div className="unlock-form">
        <p style={{ fontWeight: 500, marginBottom: '4px' }}>Enter lock key for "{space.name}"</p>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
          The key is only held in memory and cleared when you lock or leave.
        </p>
        {unlockError && <div className="error-msg">{unlockError}</div>}
        <div className="form-group">
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Lock key"
            autoFocus
            id="unlock-key-input"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setStatus('locked');
              setInputKey('');
              setUnlockError('');
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUnlock}
            disabled={unlocking || !inputKey}
            id="confirm-unlock-btn"
          >
            {unlocking ? 'Verifying…' : 'Unlock'}
          </button>
        </div>
      </div>
    );
  }

  // ── Unlocked view ──────────────────────────────────────────────────────────
  return (
    <div onClick={resetAutoLock}>
      {/* Header */}
      <div className="locked-header">
        <div className="locked-status">
          <span className="locked-icon">🔓</span>
          <span style={{ fontWeight: 500 }}>{space.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAddForm((v) => !v)}
            id="add-locked-text-btn"
          >
            + Add
          </button>
          <button className="btn-ghost" onClick={lock}>
            Lock
          </button>
        </div>
      </div>

      <div className="auto-lock-notice">Auto-locks after 5 minutes of inactivity.</div>

      {showAddForm && (
        <AddLockedForm
          spaceId={space.id}
          lockKey={lockKey}
          onAdded={handleAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {loadingItems && items.length === 0 && (
        <p className="loading-text">Loading…</p>
      )}

      {!loadingItems && items.length === 0 && (
        <div className="empty-state">
          <p>No locked texts yet.</p>
          <p>Click "+ Add" to store something privately.</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        {items.map((item) => (
          <LockedTextItem
            key={item.id}
            item={item}
            spaceId={space.id}
            lockKey={lockKey}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {hasMore && (
        <div className="load-more">
          <button
            className="btn btn-secondary"
            onClick={() => {
              fetchItems(page + 1);
              resetAutoLock();
            }}
            disabled={loadingItems}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
