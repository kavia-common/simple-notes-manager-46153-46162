import React from 'react';

/**
 * Renders a single note item with edit and delete actions.
 * Accessible buttons with ARIA labels.
 *
 * Props:
 * - note: { id, title, content, createdAt, updatedAt }
 * - onEdit: function(note) -> open edit modal with the given note
 * - onDelete: function(note) -> delete flow with confirmation
 */
// PUBLIC_INTERFACE
export default function NoteListItem({ note, onEdit, onDelete }) {
  const created = new Date(note.createdAt);
  const updated = new Date(note.updatedAt);
  const same = note.createdAt === note.updatedAt;

  return (
    <div className="note-item card" role="article" aria-labelledby={`note-${note.id}-title`}>
      <div className="note-item-body" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            <h3 id={`note-${note.id}-title`} style={{ margin: '0 0 6px 0', fontSize: 16 }}>
              {note.title || '(Untitled)'}
            </h3>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
              {truncate(note.content || '', 120)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              className="btn secondary"
              onClick={() => onEdit(note)}
              aria-label={`Edit note ${note.title || 'untitled'}`}
            >
              ✎ Edit
            </button>
            <button
              className="btn danger"
              onClick={() => onDelete(note)}
              aria-label={`Delete note ${note.title || 'untitled'}`}
            >
              🗑 Delete
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 12 }} className="text-muted">
          <span title={created.toISOString()}>Created: {created.toLocaleString()}</span>
          <span title={updated.toISOString()}>
            {same ? 'Updated: —' : `Updated: ${updated.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function truncate(text, len) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len - 1) + '…' : text;
}
