import CopyButton from './CopyButton';

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${time}`;
}

const LANG_LABELS = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', c: 'C', cpp: 'C++', csharp: 'C#', go: 'Go', rust: 'Rust',
  kotlin: 'Kotlin', swift: 'Swift', html: 'HTML', css: 'CSS', sql: 'SQL',
  bash: 'Bash', json: 'JSON', yaml: 'YAML', markdown: 'Markdown', other: 'Code',
};

export default function CodeItem({ item, onDelete, onPin }) {
  const langLabel = LANG_LABELS[item.language] || item.language || 'Code';

  return (
    <li className="text-item code-item">
      {/* Header row */}
      <div className="code-item-header">
        <div className="code-item-header-left">
          {item.language && (
            <span className="code-lang-badge">{langLabel}</span>
          )}
          {item.title && (
            <span className="code-item-title">{item.title}</span>
          )}
        </div>
        <span className="text-item-meta" style={{ marginLeft: 'auto' }}>
          {formatDate(item.createdAt)}
        </span>
        <div className="text-item-actions">
          <button
            className={`btn-pin${item.isPinned ? ' pinned' : ''}`}
            onClick={() => onPin(item.id)}
            title={item.isPinned ? 'Unpin' : 'Pin'}
            aria-label={item.isPinned ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
          <CopyButton getText={item.content} />
          <button
            className="btn-danger"
            onClick={() => onDelete(item.id)}
            title="Delete"
            aria-label="Delete snippet"
          >
            ×
          </button>
        </div>
      </div>

      {/* Code block */}
      <pre className="code-block"><code>{item.content}</code></pre>
    </li>
  );
}
