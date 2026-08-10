import CopyButton from './CopyButton';
import LinkCard from './LinkCard';

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${time}`;
}

// URL regex — matches http/https URLs including query strings and fragments
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

/**
 * Splits text on URLs. Each URL is rendered via <LinkCard> for rich display.
 * Non-URL segments are plain text with preserved newlines.
 */
function LinkedText({ text }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          URL_REGEX.lastIndex = 0;
          return <LinkCard key={i} url={part} />;
        }
        return part.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ));
      })}
    </>
  );
}

export default function TextItem({ item, onDelete, onPin }) {
  return (
    <li className={`text-item${item.isPinned ? ' pinned' : ''}`}>
      <div className="text-item-body">
        <div className="text-item-content">
          <LinkedText text={item.content} />
        </div>

        {/* Attached image */}
        {item.imageData && (
          <img
            src={item.imageData}
            alt="Attached"
            className="text-item-image"
            loading="lazy"
          />
        )}

        <div className="text-item-meta">{formatDate(item.createdAt)}</div>
      </div>

      <div className="text-item-actions">
        {/* Pin button */}
        <button
          className={`btn-pin${item.isPinned ? ' pinned' : ''}`}
          onClick={() => onPin(item.id)}
          title={item.isPinned ? 'Unpin' : 'Pin to top'}
          aria-label={item.isPinned ? 'Unpin' : 'Pin'}
        >
          📌
        </button>
        <CopyButton getText={item.content} />
        <button
          className="btn-danger"
          onClick={() => onDelete(item.id)}
          title="Delete"
          aria-label="Delete text"
        >
          ×
        </button>
      </div>
    </li>
  );
}
