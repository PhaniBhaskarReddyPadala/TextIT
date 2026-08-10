/**
 * LinkCard — renders a URL as:
 *   • YouTube  → inline embedded player
 *   • Instagram / Twitter / GitHub → styled platform card
 *   • Everything else → favicon + hostname chip
 */

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function detectPlatform(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    const ytMatch = url.match(YOUTUBE_REGEX);
    if (ytMatch) return { type: 'youtube', videoId: ytMatch[1] };

    if (host === 'instagram.com') return { type: 'instagram' };
    if (host === 'twitter.com' || host === 'x.com') return { type: 'twitter' };
    if (host === 'github.com') return { type: 'github' };

    return { type: 'generic', host };
  } catch {
    return { type: 'generic', host: url };
  }
}

const PLATFORM_META = {
  instagram: { label: 'Instagram', icon: '📸', color: '#e1306c' },
  twitter:   { label: 'Twitter / X', icon: '𝕏', color: '#000000' },
  github:    { label: 'GitHub', icon: '⚫', color: '#24292e' },
};

export default function LinkCard({ url }) {
  const info = detectPlatform(url);

  /* ── YouTube embed ── */
  if (info.type === 'youtube') {
    return (
      <div className="link-card-youtube">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${info.videoId}`}
          title="YouTube video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  /* ── Social platform card (Instagram / Twitter / GitHub) ── */
  if (PLATFORM_META[info.type]) {
    const meta = PLATFORM_META[info.type];
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="link-card link-card-social"
        style={{ '--platform-color': meta.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="link-card-icon">{meta.icon}</span>
        <span className="link-card-label">{meta.label}</span>
        <span className="link-card-url">{url.length > 50 ? url.slice(0, 50) + '…' : url}</span>
        <span className="link-card-arrow">↗</span>
      </a>
    );
  }

  /* ── Generic URL chip ── */
  let displayHost = info.host;
  try { displayHost = new URL(url).hostname.replace(/^www\./, ''); } catch { /* noop */ }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-card link-card-generic"
      onClick={(e) => e.stopPropagation()}
    >
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img
        className="link-card-favicon"
        src={`https://www.google.com/s2/favicons?domain=${displayHost}&sz=16`}
        width={16}
        height={16}
        aria-hidden="true"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <span>{displayHost}</span>
      <span className="link-card-arrow">↗</span>
    </a>
  );
}
