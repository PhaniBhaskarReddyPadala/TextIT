import { useState } from 'react';

export default function SpaceSelector({ spaces, activeSpaceId, onSelect, onNew }) {
  const [hover, setHover] = useState(null);

  return (
    <div className="space-selector" role="tablist" aria-label="Spaces">
      {spaces.map((space) => (
        <button
          key={space.id}
          role="tab"
          aria-selected={space.id === activeSpaceId}
          className={`space-tab${space.id === activeSpaceId ? ' active' : ''}`}
          onClick={() => onSelect(space)}
          onMouseEnter={() => setHover(space.id)}
          onMouseLeave={() => setHover(null)}
          title={space.name}
        >
          {space.isLocked && <span className="space-lock-icon">🔒</span>}
          <span className="space-tab-name">{space.name}</span>
        </button>
      ))}
      <button
        className="space-tab space-tab-new"
        onClick={onNew}
        title="Create new space"
      >
        + New
      </button>
    </div>
  );
}
