import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function DeleteSpaceModal({ space, onDeleted, onClose }) {
  const [lockKey, setLockKey] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const lockKeyRef = useRef(null);

  useEffect(() => {
    if (space.isLocked) {
      lockKeyRef.current?.focus();
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [space.isLocked, onClose]);

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');

    if (space.isLocked && !lockKey) {
      setError('Password is required to delete a private space');
      return;
    }

    setDeleting(true);
    try {
      const res = await api.spaces.delete(space.id, space.isLocked ? { lockKey } : undefined);

      if (res.success) {
        onDeleted(space.id);
      } else {
        setError(res.message || 'Failed to delete space');
      }
    } catch {
      setError('Network error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Delete space">
        <div className="modal-header">
          <h2 className="modal-title">Delete Space</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleDelete} noValidate>
          {error && <div className="error-msg">{error}</div>}

          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            Are you sure you want to delete <strong>"{space.name}"</strong>? All items in this space will be permanently deleted.
          </p>

          {space.isLocked && (
            <div className="form-group">
              <label htmlFor="delete-space-key">
                Space Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="delete-space-key"
                ref={lockKeyRef}
                type="password"
                value={lockKey}
                onChange={(e) => setLockKey(e.target.value)}
                placeholder="Enter space password to confirm"
                disabled={deleting}
                required
              />
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
