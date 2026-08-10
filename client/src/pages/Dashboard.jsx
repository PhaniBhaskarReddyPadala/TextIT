// Dashboard — space-aware layout
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import TextEditor from '../components/TextEditor';
import TextItem from '../components/TextItem';
import LockedSpaceView from '../components/LockedSpaceView';
import CreateSpaceModal from '../components/CreateSpaceModal';

// ── Lazy-loaded code space components (only downloaded when a Code space is clicked)
const CodeEditor = lazy(() => import('../components/CodeEditor'));
const CodeItem   = lazy(() => import('../components/CodeItem'));

export default function Dashboard() {
  const { user, logout } = useAuth();

  // ── Spaces state ──────────────────────────────────────────────────────────
  const [spaces, setSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ── Texts state (for unlocked spaces) ─────────────────────────────────────
  const [texts, setTexts] = useState([]);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // ── Logout ────────────────────────────────────────────────────────────────
  const [loggingOut, setLoggingOut] = useState(false);

  // ── Derived: active space object ──────────────────────────────────────────
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || null;

  // ── Load spaces ───────────────────────────────────────────────────────────
  const fetchSpaces = useCallback(async () => {
    setLoadingSpaces(true);
    try {
      const res = await api.spaces.list();
      if (res.success) {
        setSpaces(res.data);
        setActiveSpaceId((prev) => {
          if (prev && res.data.find((s) => s.id === prev)) return prev;
          const def = res.data.find((s) => s.isDefault);
          return def ? def.id : res.data[0]?.id || null;
        });
      }
    } finally {
      setLoadingSpaces(false);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  // ── Load texts for the active unlocked space ──────────────────────────────
  const fetchTexts = useCallback(async (spaceId, pageNum = 1) => {
    if (!spaceId) return;
    setLoadingTexts(true);
    try {
      const res = await api.texts.list(spaceId, pageNum);
      if (res.success) {
        setTexts((prev) => (pageNum === 1 ? res.data : [...prev, ...res.data]));
        setHasMore(res.pagination?.hasMore || false);
        setPage(pageNum);
      }
    } finally {
      setLoadingTexts(false);
    }
  }, []);

  // Refetch texts whenever active space changes (only for unlocked spaces)
  useEffect(() => {
    if (!activeSpace || activeSpace.isLocked) {
      setTexts([]);
      setHasMore(false);
      setPage(1);
      return;
    }
    fetchTexts(activeSpace.id, 1);
  }, [activeSpace, fetchTexts]);

  // ── Text CRUD ─────────────────────────────────────────────────────────────
  const handleSaved = useCallback((newText) => {
    // Pinned items sort to top; new items go below any pinned ones
    setTexts((prev) => {
      const updated = [newText, ...prev];
      return updated.sort((a, b) => {
        if (a.isPinned === b.isPinned) return 0;
        return a.isPinned ? -1 : 1;
      });
    });
  }, []);

  const handleDelete = useCallback(async (textId) => {
    if (!activeSpaceId) return;
    await api.texts.delete(activeSpaceId, textId);
    setTexts((prev) => prev.filter((t) => t.id !== textId));
  }, [activeSpaceId]);

  const handlePin = useCallback(async (textId) => {
    if (!activeSpaceId) return;
    const res = await api.texts.togglePin(activeSpaceId, textId);
    if (res.success) {
      setTexts((prev) => {
        const updated = prev.map((t) =>
          t.id === textId ? { ...t, isPinned: res.data.isPinned } : t
        );
        // Re-sort: pinned items first
        return updated.sort((a, b) => {
          if (a.isPinned === b.isPinned) return 0;
          return a.isPinned ? -1 : 1;
        });
      });
    }
  }, [activeSpaceId]);

  // ── Space CRUD ────────────────────────────────────────────────────────────
  const handleSpaceCreated = (newSpace) => {
    setSpaces((prev) => [...prev, newSpace]);
    setActiveSpaceId(newSpace.id);
    setShowCreateModal(false);
  };

  const handleDeleteSpace = async (spaceId) => {
    if (!window.confirm('Delete this space and all its texts?')) return;
    setDeletingId(spaceId);
    try {
      await api.spaces.delete(spaceId);
      setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
      if (activeSpaceId === spaceId) {
        const remaining = spaces.filter((s) => s.id !== spaceId);
        const def = remaining.find((s) => s.isDefault);
        setActiveSpaceId(def ? def.id : remaining[0]?.id || null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  // ── Space icon helper ─────────────────────────────────────────────────────
  const spaceIcon = (space) => {
    if (space.type === 'code') return <span className="space-tab-icon code-icon">&lt;/&gt;</span>;
    if (space.isLocked) return <span className="space-tab-icon">🔒</span>;
    return <span className="space-tab-icon">📄</span>;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ── */}
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <span className="logo">TextIt</span>
            <div className="header-actions">
              {user && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {user.name}
                </span>
              )}
              <button
                className="btn-logout"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="dashboard-body container">

        {/* ── Left: Space Sidebar ── */}
        <aside className="space-sidebar">
          <div className="space-sidebar-header">
            <span className="section-title" style={{ margin: 0 }}>Spaces</span>
            <button
              className="btn-new-space"
              onClick={() => setShowCreateModal(true)}
              title="New space"
              id="new-space-btn"
            >
              +
            </button>
          </div>

          {loadingSpaces ? (
            <p className="loading-text" style={{ padding: '8px 0' }}>Loading…</p>
          ) : (
            <ul className="space-list">
              {spaces.map((space) => (
                <li key={space.id}>
                  <div
                    className={`space-tab${activeSpaceId === space.id ? ' active' : ''}`}
                    onClick={() => setActiveSpaceId(space.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSpaceId(space.id); }}
                    id={`space-tab-${space.id}`}
                    role="button"
                    tabIndex={0}
                  >
                    {spaceIcon(space)}
                    <span className="space-tab-name">{space.name}</span>
                    {space.isDefault && (
                      <span className="space-tab-badge">default</span>
                    )}
                    {!space.isDefault && (
                      <button
                        className="space-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSpace(space.id);
                        }}
                        disabled={deletingId === space.id}
                        title="Delete space"
                        aria-label={`Delete ${space.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── Right: Space Content ── */}
        <main className="space-content" style={{ paddingBottom: '48px' }}>
          {!activeSpace ? (
            <div className="empty-state" style={{ paddingTop: '40px' }}>
              <p>No space selected.</p>
            </div>
          ) : activeSpace.isLocked ? (
            /* Locked space — full unlock/manage flow */
            <LockedSpaceView space={activeSpace} key={activeSpace.id} />
          ) : activeSpace.type === 'code' ? (
            /* Code space — lazy loaded, only downloads JS bundle on first click */
            <Suspense fallback={<p className="loading-text" style={{ paddingTop: '24px' }}>Loading code editor…</p>}>
              <>
                <section aria-label={`${activeSpace.name} code editor`}>
                  <CodeEditor
                    spaceId={activeSpace.id}
                    onSaved={handleSaved}
                    key={activeSpace.id}
                  />
                </section>

                <hr className="divider" />

                <section aria-label="Saved snippets">
                  <div className="section-title">Saved snippets</div>
                  {loadingTexts && texts.length === 0 ? (
                    <p className="loading-text">Loading…</p>
                  ) : texts.length === 0 ? (
                    <div className="empty-state">
                      <p>No snippets yet.</p>
                      <p>Paste code above and save it.</p>
                    </div>
                  ) : (
                    <>
                      <ul className="text-list">
                        {texts.map((item) => (
                          <CodeItem
                            key={item.id}
                            item={item}
                            onDelete={handleDelete}
                            onPin={handlePin}
                          />
                        ))}
                      </ul>
                      {hasMore && (
                        <div className="load-more">
                          <button
                            className="btn btn-secondary"
                            onClick={() => fetchTexts(activeSpace.id, page + 1)}
                            disabled={loadingTexts}
                          >
                            Load more
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </>
            </Suspense>
          ) : (
            /* Unlocked text space — normal text editor + list */
            <>
              <section aria-label={`${activeSpace.name} editor`}>
                <TextEditor
                  spaceId={activeSpace.id}
                  onSaved={handleSaved}
                  key={activeSpace.id}
                />
              </section>

              <hr className="divider" />

              <section aria-label="Recent texts">
                <div className="section-title">Recent</div>

                {loadingTexts && texts.length === 0 ? (
                  <p className="loading-text">Loading…</p>
                ) : texts.length === 0 ? (
                  <div className="empty-state">
                    <p>Nothing here yet.</p>
                    <p>Paste something above and save it.</p>
                  </div>
                ) : (
                  <>
                    <ul className="text-list">
                      {texts.map((item) => (
                        <TextItem
                          key={item.id}
                          item={item}
                          onDelete={handleDelete}
                          onPin={handlePin}
                        />
                      ))}
                    </ul>
                    {hasMore && (
                      <div className="load-more">
                        <button
                          className="btn btn-secondary"
                          onClick={() => fetchTexts(activeSpace.id, page + 1)}
                          disabled={loadingTexts}
                        >
                          Load more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* ── Create Space Modal ── */}
      {showCreateModal && (
        <CreateSpaceModal
          onCreated={handleSpaceCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
