import React from 'react';
import NoteListItem from './NoteListItem';

export default function NoteList({ notes, onEdit, onDelete }) {
  if (!notes || notes.length === 0) {
    return (
      <div className="card" role="status" aria-live="polite" style={{ padding: 18, textAlign: 'center' }}>
        <p style={{ margin: 0 }} className="text-muted">
          No notes yet. Click “New Note” to create your first note.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {notes.map(n => (
        <NoteListItem key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
