import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listNotes, createNote, updateNote, deleteNote } from '../lib/api';
import NoteList from './NoteList';
import NoteModal from './NoteModal';
import { getAllTags } from '../lib/storage';
import ScrollControls from './ScrollControls';

const SORTS = [
  { id: 'updatedDesc', label: 'Updated (desc)' },
  { id: 'createdDesc', label: 'Created (desc)' },
  { id: 'titleAsc', label: 'Title (asc)' },
];

function applySort(items, mode) {
  const arr = [...items];
  switch (mode) {
    case 'createdDesc':
      arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case 'titleAsc':
      arr.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'updatedDesc':
    default:
      arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return arr;
}

/**
 * NotesPage
 * Main page managing notes state, search, sort, and the create/edit modal.
 * The primary view is the List view for easy browsing.
 * Includes optimistic updates and graceful fallback to localStorage.
 */
// PUBLIC_INTERFACE
export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState(''); // preserved in component state
  const [sort, setSort] = useState('updatedDesc');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  // Flag to trigger auto-scroll after successful create; effect will run post-DOM update
  const [shouldScrollAfterCreate, setShouldScrollAfterCreate] = useState(false);

  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const listRef = useRef(null);

  // Load notes initially
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listNotes();
        if (mounted) setNotes(Array.isArray(data) ? data : []);
      } catch (e) {
        showToast('Failed to load notes. Using local data if available.', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  // Debounce query changes (250–300ms)
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const availableTags = useMemo(() => getAllTags(notes), [notes]);

  // Search + Tag filter integrates with list view (AND logic)
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const byText = q
      ? notes.filter(n =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q)
        )
      : notes;
    const byTags = selectedTags.length
      ? byText.filter(n => {
          const ntags = Array.isArray(n.tags) ? n.tags : [];
          return selectedTags.every(t => ntags.includes(t));
        })
      : byText;
    return applySort(byTags, sort);
  }, [notes, debouncedQuery, selectedTags, sort]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (note) => {
    setEditing(note);
    setModalOpen(true);
  };

  // After a note is created and state is updated, run auto-scroll once DOM is committed
  useEffect(() => {
    if (!shouldScrollAfterCreate) return;
    const el = listRef.current;
    if (!el) {
      // If list not yet mounted (e.g., transitioning from empty to first item), try next frame
      requestAnimationFrame(() => setShouldScrollAfterCreate(true));
      return;
    }
    requestAnimationFrame(() => {
      try {
        el.scrollTo({ top: el.scrollHeight, left: 0, behavior: 'smooth' });
      } catch {
        el.scrollTop = el.scrollHeight;
      } finally {
        setShouldScrollAfterCreate(false);
      }
    });
  }, [shouldScrollAfterCreate, listRef]);

  const onDelete = async (note) => {
    const ok = window.confirm(`Delete note "${note.title || 'Untitled'}"?`);
    if (!ok) return;
    const prev = notes;
    setNotes(prev => prev.filter(n => n.id !== note.id));
    try {
      await deleteNote(note.id);
      showToast('Note deleted.');
    } catch {
      showToast('Failed to delete note. Restoring.', 'error');
      setNotes(prev);
    }
  };

  const onSave = async (payload) => {
    // Ensure images and audio fields exist for backward compatibility
    const normalizedPayload = {
      ...payload,
      images: Array.isArray(payload.images) ? payload.images : [],
      audio: Array.isArray(payload.audio) ? payload.audio : [],
    };

    if (editing) {
      const now = new Date().toISOString();
      const optimistic = notes.map(n =>
        n.id === editing.id ? { ...n, ...normalizedPayload, updatedAt: now } : n
      );
      setNotes(optimistic);
      setModalOpen(false);
      try {
        const updated = await updateNote(editing.id, normalizedPayload);
        setNotes(prev =>
          prev.map(n => (n.id === editing.id ? (updated || n) : n))
        );
        showToast('Note updated.');
      } catch {
        showToast('Failed to update note. The local version is kept.', 'error');
      } finally {
        setEditing(null);
      }
    } else {
      setModalOpen(false);
      try {
        const created = await createNote(normalizedPayload);
        setNotes(prev => applySort([created, ...prev], sort));
        showToast('Note created.');
        // Trigger auto-scroll after the new item renders
        setShouldScrollAfterCreate(true);
      } catch {
        showToast('Failed to create note.', 'error');
      }
    }
  };

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const clearQuery = () => setQuery('');

  const hasNoResults =
    !loading && filtered.length === 0 && (debouncedQuery.trim().length > 0 || selectedTags.length > 0);
  const isEmptyDataset = !loading && notes.length === 0;

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearTagFilters = () => setSelectedTags([]);

  return (
    <section aria-label="Notes manager">
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <div style={{ flex: 2, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <label htmlFor="search" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Search
              </label>
              <div className="helper" aria-hidden="true" style={{ marginBottom: 6 }}>
                View: List
              </div>
            </div>
            <div className="input-with-icon">
              <span aria-hidden="true" className="input-leading-icon">🔎</span>
              <input
                id="search"
                ref={searchRef}
                className="input"
                type="search"
                placeholder="Search by title or content…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search notes"
              />
              {query ? (
                <button
                  type="button"
                  className="btn-clear"
                  onClick={clearQuery}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>
            <div className="helper" aria-live="polite" style={{ marginTop: 6 }}>
              {debouncedQuery
                ? `Filtering by “${debouncedQuery}”`
                : 'Tip: Search matches both title and content'}
            </div>
          </div>
          <div style={{ minWidth: 240 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Tag Filter
            </label>
            <div className="tag-filter-bar">
              {availableTags.length === 0 ? (
                <div className="helper">No tags yet. Add tags while creating or editing notes.</div>
              ) : (
                <div className="tag-filter-chips" role="listbox" aria-label="Filter by tags">
                  {availableTags.map(t => {
                    const active = selectedTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`chip chip-clickable ${active ? 'chip-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => toggleTagFilter(t)}
                        title={active ? `Remove filter: ${t}` : `Filter by: ${t}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedTags.length > 0 ? (
                <div className="tag-filter-actions">
                  <button type="button" className="btn secondary" onClick={clearTagFilters} aria-label="Clear tag filters">
                    Clear Tags
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ minWidth: 200 }}>
            <label htmlFor="sort" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Sort by
            </label>
            <select
              id="sort"
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort notes"
            >
              {SORTS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', marginBottom: 6, visibility: 'hidden' }}>Action</label>
            <button className="btn" onClick={openNew} aria-label="Create new note">
              ＋ New Note
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" role="status" aria-live="polite" style={{ padding: 18 }}>
          <span className="text-muted">Loading notes…</span>
        </div>
      ) : hasNoResults ? (
        <div
          className="card empty-state"
          role="status"
          aria-live="polite"
          style={{ padding: 18, textAlign: 'center' }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No results</div>
          <div className="text-muted">
            {selectedTags.length > 0
              ? `No notes match the selected tag${selectedTags.length > 1 ? 's' : ''} (${selectedTags.join(', ')}). Try clearing some tags or adjusting your search.`
              : `No notes match “${debouncedQuery}”. Try a different keyword.`}
          </div>
        </div>
      ) : isEmptyDataset ? (
        <NoteList notes={[]} onEdit={openEdit} onDelete={onDelete} />
      ) : (
        <NoteList ref={listRef} notes={filtered} onEdit={openEdit} onDelete={onDelete} />
      )}

      <ScrollControls targetRef={listRef} />

      <NoteModal
        isOpen={isModalOpen}
        initial={editing}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={onSave}
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="card"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            padding: '10px 12px',
            borderLeft: `4px solid ${toast.type === 'error' ? 'var(--color-error)' : 'var(--color-accent)'}`,
            boxShadow: 'var(--shadow-lg)',
            maxWidth: 360,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {toast.type === 'error' ? 'Error' : 'Notice'}
          </div>
          <div>{toast.message}</div>
        </div>
      ) : null}
    </section>
  );
}
