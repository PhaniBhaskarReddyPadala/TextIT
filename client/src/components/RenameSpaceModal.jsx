import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function RenameSpaceModal({ space, onRenamed, onClose }) {
  const [name, setName] = useState(space.name || '');
  const [lockKey, setLockKey] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Space name is required');
      return;
    }

    if (space.isLocked && !lockKey) {
      setError('Password is required for private spaces');
      return;
    }

    setSaving(true);
    try {
      const res = await api.spaces.update(space.id, {
        name: name.trim(),
        lockKey: space.isLocked ? lockKey : undefined,
      });

      if (res.success) {
        onRenamed(res.data);
      } else {
        setError(res.message || 'Failed to rename space');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Rename space">
        <div className="modal-header">
          <h2 className="modal-title">Rename Space</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="rename-space-name">Space Name</label>
            <input
              id="rename-space-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Notes, Ideas"
              maxLength={50}
              disabled={saving}
              required
            />
          </div>

          {space.isLocked && (
            <div className="form-group">
              <label htmlFor="rename-space-key">Space Password</label>
              <input
                id="rename-space-key"
                type="password"
                value={lockKey}
                onChange={(e) => setLockKey(e.target.value)}
                placeholder="Enter password to authorize rename"
                disabled={saving}
                required
              />
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
