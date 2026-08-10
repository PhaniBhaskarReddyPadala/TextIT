import { useState, useRef } from 'react';
import { api } from '../services/api';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'other', label: 'Other' },
];

export default function CodeEditor({ spaceId, onSaved }) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [expiry, setExpiry] = useState('1h');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const textareaRef = useRef(null);

  const save = async () => {
    const trimmed = code.trim();
    if (!trimmed || saving || !spaceId) return;
    setSaving(true);
    try {
      const res = await api.texts.create(spaceId, {
        content: trimmed,
        title: title.trim() || '',
        language,
        expiry,
      });
      if (res.success) {
        setCode('');
        setTitle('');
        setSavedMsg('Saved');
        setTimeout(() => setSavedMsg(''), 2000);
        onSaved(res.data);
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleKeyDown = (e) => {
    // Tab → insert 2 spaces instead of losing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.substring(0, start) + '  ' + code.substring(end);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
    // Ctrl+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  };

  return (
    <div className="editor-section">
      {/* Language selector */}
      <div className="code-editor-header">
        <select
          className="code-lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          id="code-lang-select"
          aria-label="Select language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <span className="code-editor-hint">Tab = 2 spaces · Ctrl+Enter to save</span>
      </div>

      {/* Optional title */}
      <input
        type="text"
        className="code-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        maxLength={200}
        aria-label="Snippet title"
        id="code-title-input"
      />

      {/* Monospace textarea */}
      <textarea
        ref={textareaRef}
        className="code-textarea"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Paste ${LANGUAGES.find(l => l.value === language)?.label ?? 'code'} here…`}
        rows={10}
        autoFocus
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="Code input"
        id="code-editor"
      />

      {/* Footer */}
      <div className="editor-footer">
        <div className="expiry-row">
          <label htmlFor="code-expiry-select" style={{ margin: 0, textTransform: 'none', letterSpacing: 0 }}>
            Expires:
          </label>
          <select
            id="code-expiry-select"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            <option value="never">Never</option>
            <option value="1h">1 hour</option>
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {savedMsg && <span className="save-success">✓ {savedMsg}</span>}
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving || !code.trim()}
            id="code-save-btn"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
