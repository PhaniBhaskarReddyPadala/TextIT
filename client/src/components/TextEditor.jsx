import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { api } from '../services/api';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

// ─── QR Popover ───────────────────────────────────────────────────────────────
function QRPopover({ text, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    QRCode.toCanvas(canvasRef.current, text, {
      width: 200,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
    });
  }, [text]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="qr-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="QR code sharing"
    >
      <div className="qr-card">
        <div className="qr-card-header">
          <span className="qr-card-title">Share via QR</span>
          <button
            className="qr-close-btn"
            onClick={onClose}
            aria-label="Close QR popover"
            id="qr-close-btn"
          >
            ×
          </button>
        </div>

        <div className="qr-canvas-wrap">
          <canvas ref={canvasRef} id="qr-canvas" />
        </div>

        <div className="qr-code-section">
          <div className="qr-code-label">Content</div>
          <pre className="qr-code-text">{text}</pre>
        </div>

        <button
          className="qr-download-btn"
          id="qr-download-btn"
          onClick={() => {
            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = canvasRef.current?.toDataURL('image/png') || '';
            link.click();
          }}
        >
          ↓ Download QR
        </button>
      </div>
    </div>
  );
}

export default function TextEditor({ spaceId, onSaved }) {
  const [content, setContent] = useState('');
  const [expiry, setExpiry] = useState('1h');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [imageData, setImageData] = useState(null); // Base64 data URL
  const [imageError, setImageError] = useState('');
  const [qrText, setQrText] = useState(null); // null = closed, string = open
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(100, el.scrollHeight)}px`;
  }, [content]);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');

    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image too large (max 2 MB)');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-picked
  };

  const save = async () => {
    const trimmed = content.trim();
    if (!trimmed || saving || !spaceId) return;

    setSaving(true);
    try {
      const res = await api.texts.create(spaceId, {
        content: trimmed,
        expiry,
        imageData: imageData || undefined,
      });
      if (res.success) {
        setContent('');
        setImageData(null);
        setSavedMsg('Saved');
        setTimeout(() => setSavedMsg(''), 2000);
        onSaved(res.data);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  };

  const openQR = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setQrText(trimmed);
  }, [content]);

  return (
    <div className="editor-section">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste or type text here…"
        rows={4}
        autoFocus
        aria-label="Text input"
        id="text-editor"
      />

      {/* Image preview */}
      {imageData && (
        <div className="image-preview-wrap">
          <img src={imageData} alt="Attachment preview" className="image-preview-thumb" />
          <button
            className="image-preview-remove"
            onClick={() => setImageData(null)}
            title="Remove image"
            aria-label="Remove attached image"
          >
            ×
          </button>
        </div>
      )}
      {imageError && <p className="image-error">{imageError}</p>}

      <div className="editor-footer">
        <div className="expiry-row">
          <label htmlFor="expiry-select" style={{ margin: 0, textTransform: 'none', letterSpacing: 0 }}>
            Expires:
          </label>
          <select
            id="expiry-select"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            <option value="never">Never</option>
            <option value="1h">1 hour</option>
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImagePick}
            id="image-file-input"
            aria-label="Attach image"
          />
          <button
            type="button"
            className={`btn-attach${imageData ? ' has-image' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            title={imageData ? 'Change image' : 'Attach image'}
            aria-label="Attach image"
            id="attach-image-btn"
          >
            📎
          </button>

          {savedMsg && <span className="save-success">✓ {savedMsg}</span>}
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving || !content.trim()}
            id="save-btn"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          {/* QR Share button */}
          <button
            type="button"
            className="btn-qr"
            onClick={openQR}
            disabled={!content.trim()}
            title="Generate QR code"
            aria-label="Generate QR code"
            id="qr-share-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
              <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
              <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/>
              <path d="M14 14h2v2h-2z" fill="currentColor" stroke="none"/>
              <path d="M18 14h3v2h-3z" fill="currentColor" stroke="none"/>
              <path d="M14 18h2v3h-2z" fill="currentColor" stroke="none"/>
              <path d="M18 18h3v3h-3z" fill="currentColor" stroke="none"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
        Ctrl+Enter to save
      </div>

      {/* QR Popover */}
      {qrText !== null && (
        <QRPopover text={qrText} onClose={() => setQrText(null)} />
      )}
    </div>
  );
}
