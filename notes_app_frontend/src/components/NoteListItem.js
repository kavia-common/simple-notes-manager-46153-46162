import React from 'react';

/**
 * Renders a single note item with quick actions and metadata.
 * Accessible buttons with ARIA labels.
 *
 * Props:
 * - note: { id, title, content, createdAt, updatedAt, tags? }
 * - onEdit: function(note) -> open edit modal with the given note
 * - onDelete: function(note) -> delete flow with confirmation
 */
// PUBLIC_INTERFACE
export default function NoteListItem({ note, onEdit, onDelete }) {
  const created = new Date(note.createdAt);
  const updated = new Date(note.updatedAt);
  const same = note.createdAt === note.updatedAt;

  const title = (note.title || '(Untitled)').trim();
  const preview = truncate(note.content || '', 140);

  const updatedLabel = same ? '—' : updated.toLocaleString();
  const tags = Array.isArray(note.tags) ? note.tags : [];

  return (
    <div className="note-item card" role="article" aria-labelledby={`note-${note.id}-title`}>
      <div className="note-item-body" style={{ padding: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            alignItems: 'start',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="text-muted"
              style={{
                fontSize: 12,
                marginBottom: 6,
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span>
                <strong>Updated:</strong> <span title={updated.toISOString()}>{updatedLabel}</span>
              </span>
              <span>
                <strong>Created:</strong>{' '}
                <span title={created.toISOString()}>{created.toLocaleString()}</span>
              </span>
            </div>
            <h3
              id={`note-${note.id}-title`}
              style={{
                margin: '0 0 6px 0',
                fontSize: 16,
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              {title}
            </h3>
            <p
              className="text-muted"
              style={{
                margin: 0,
                fontSize: 13,
                wordBreak: 'break-word',
              }}
            >
              {preview}
            </p>
            {tags.length > 0 ? (
              <div className="tag-row" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tags.map(t => (
                  <span className="chip chip-small" key={t} aria-label={`Tag ${t}`}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexShrink: 0,
              alignItems: 'center',
            }}
          >
            <button
              className="btn secondary"
              onClick={() => alert('Viewing note:\n\n' + (note.content || '').slice(0, 100) + (note.content && note.content.length > 100 ? '…' : ''))}
              aria-label={`View note ${title}`}
              title="View"
            >
              👁 View
            </button>
            <button
              className="btn secondary"
              onClick={() => onEdit(note)}
              aria-label={`Edit note ${title}`}
              title="Edit"
            >
              ✎ Edit
            </button>
            <button
              className="btn danger"
              onClick={() => onDelete(note)}
              aria-label={`Delete note ${title}`}
              title="Delete"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function truncate(text, len) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len - 1) + '…' : text;
}
