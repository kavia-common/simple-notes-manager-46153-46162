import React, { forwardRef } from 'react';
import NoteListItem from './NoteListItem';

/**
 * NoteList
 * Renders a responsive, scrollable list of notes with per-item edit/delete actions.
 * - Polished empty state
 * - Consistent spacing and Ocean Professional styling
 *
 * Props:
 * - notes: array of note objects
 * - onEdit: function(note)
 * - onDelete: function(note)
 *
 * Ref:
 * - The forwarded ref is attached to the scrollable list container div to allow external scroll controls.
 */
// PUBLIC_INTERFACE
const NoteList = forwardRef(function NoteList({ notes, onEdit, onDelete, onTogglePin }, scrollRef) {
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
      ref={scrollRef}
      role="list"
      aria-label="Notes list"
      style={{
        display: 'grid',
        gap: 12,
        /* Occupy available viewport height minus header/toolbars area to keep layout stable */
        maxHeight: 'calc(100vh - 260px)',
        overflowY: 'auto',
        paddingRight: 2, // avoid scrollbar overlap
        scrollBehavior: 'smooth',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-sm)',
        padding: 10
      }}
    >
      {notes.map((n) => (
        <div role="listitem" key={n.id} style={{ minWidth: 0 }}>
          <NoteListItem note={n} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} />
        </div>
      ))}
    </div>
  );
});

export default NoteList;
