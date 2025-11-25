import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listNotes, createNote, updateNote, deleteNote } from '../lib/api';
import NoteList from './NoteList';
import NoteModal from './NoteModal';

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

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updatedDesc');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

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

  // Debounce query changes (250ms)
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const source = q
      ? notes.filter(n =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q)
        )
      : notes;
    return applySort(source, sort);
  }, [notes, debouncedQuery, sort]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (note) => {
    setEditing(note);
    setModalOpen(true);
  };

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
    if (editing) {
      const now = new Date().toISOString();
      const optimistic = notes.map(n =>
        n.id === editing.id ? { ...n, ...payload, updatedAt: now } : n
      );
      setNotes(optimistic);
      setModalOpen(false);
      try {
        const updated = await updateNote(editing.id, payload);
        setNotes(prev =>
          prev.map(n => (n.id === editing.id ? updated || n : n))
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
        const created = await createNote(payload);
        setNotes(prev => applySort([created, ...prev], sort));
        showToast('Note created.');
      } catch {
        showToast('Failed to create note.', 'error');
      }
    }
  };

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <section aria-label="Notes manager">
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label htmlFor="search" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Search
            </label>
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
          </div>
          <div style={{ minWidth: 180 }}>
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
      ) : (
        <NoteList notes={filtered} onEdit={openEdit} onDelete={onDelete} />
      )}

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
