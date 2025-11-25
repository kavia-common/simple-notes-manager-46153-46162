import React from 'react';
import NoteListItem from './NoteListItem';

/**
 * NoteList
 * Renders a responsive, scrollable list of notes with per-item edit/delete actions.
 * - Polished empty state
 * - Consistent spacing and Ocean Professional styling
 */
// PUBLIC_INTERFACE
export default function NoteList({ notes, onEdit, onDelete }) {
  if (!notes || notes.length === 0) {
    return (
      <div
        className="card empty-state"
        role="status"
        aria-live="polite"
        style={{
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>No notes yet</div>
        <p style={{ margin: 0 }} className="text-muted">
          Click “New Note” to create your first note. Your notes will appear here in a clean, scrollable list.
        </p>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Notes list"
      style={{
        display: 'grid',
        gap: 12,
        maxHeight: 'calc(100vh - 260px)',
        overflowY: 'auto',
        paddingRight: 2, // avoid scrollbar overlap
      }}
    >
      {notes.map((n) => (
        <div role="listitem" key={n.id} style={{ minWidth: 0 }}>
          <NoteListItem note={n} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}
