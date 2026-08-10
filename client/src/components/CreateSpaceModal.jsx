import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function CreateSpaceModal({ onCreated, onClose }) {
  const [name, setName] = useState('');
  const [spaceType, setSpaceType] = useState('text'); // 'text' | 'code'
  const [isLocked, setIsLocked] = useState(false);
  const [lockKey, setLockKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    // Close on Escape
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Space name is required'); return; }
    if (spaceType === 'text' && isLocked) {
      if (lockKey.length < 4) { setError('Lock key must be at least 4 characters'); return; }
      if (lockKey !== confirmKey) { setError('Lock keys do not match'); return; }
    }

    setSaving(true);
    try {
      const res = await api.spaces.create({
        name: name.trim(),
        type: spaceType,
        isLocked: spaceType === 'text' ? isLocked : false,
        lockKey: spaceType === 'text' && isLocked ? lockKey : undefined,
      });
      if (res.success) {
        onCreated(res.data);
      } else {
        setError(res.message || 'Failed to create space');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Create new space">
        <div className="modal-header">
          <h2 className="modal-title">New Space</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="space-name">Name</label>
            <input
              id="space-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Private, API Keys"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <div className="lock-toggle">
              <button
                type="button"
                className={`lock-option${spaceType === 'text' ? ' selected' : ''}`}
                onClick={() => { setSpaceType('text'); }}
              >
                📄 Text
              </button>
              <button
                type="button"
                className={`lock-option${spaceType === 'code' ? ' selected' : ''}`}
                onClick={() => { setSpaceType('code'); setIsLocked(false); }}
              >
                💻 Code
              </button>
            </div>
          </div>

          {spaceType === 'text' && (
          <div className="form-group">
            <label>Lock</label>
            <div className="lock-toggle">
              <button
                type="button"
                className={`lock-option${!isLocked ? ' selected' : ''}`}
                onClick={() => setIsLocked(false)}
              >
                🔓 No lock
              </button>
              <button
                type="button"
                className={`lock-option${isLocked ? ' selected' : ''}`}
                onClick={() => setIsLocked(true)}
              >
                🔒 Locked
              </button>
            </div>
          </div>
          )}

          {spaceType === 'text' && isLocked && (
            <>
              <div className="form-group">
                <label htmlFor="lock-key">Lock key</label>
                <input
                  id="lock-key"
                  type="password"
                  value={lockKey}
                  onChange={(e) => setLockKey(e.target.value)}
                  placeholder="Min. 4 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-key">Confirm lock key</label>
                <input
                  id="confirm-key"
                  type="password"
                  value={confirmKey}
                  onChange={(e) => setConfirmKey(e.target.value)}
                  placeholder="Repeat lock key"
                  autoComplete="new-password"
                />
              </div>
              <div className="unlock-hint" style={{ marginBottom: '16px' }}>
                This key encrypts your text. If you forget it, content cannot be recovered.
              </div>
            </>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()} id="create-space-btn">
              {saving ? 'Creating…' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
