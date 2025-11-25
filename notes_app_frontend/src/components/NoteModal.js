import React, { useEffect, useRef, useState } from 'react';

/**
 * Accessible modal for creating and editing notes.
 * - Focuses the title field on open and returns focus to trigger on close
 * - Esc closes, Enter on buttons
 *
 * Props:
 * - isOpen: boolean to control modal visibility
 * - initial: optional note object to prefill when editing; if falsy, modal acts in "create" mode
 * - onCancel: function called when closing without saving
 * - onSave: function called with payload {title, content} when saving
 */
export default function NoteModal({ isOpen, initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Reset form when initial changes or opening
  useEffect(() => {
    setTitle(initial?.title || '');
    setContent(initial?.content || '');
    setError('');
  }, [initial, isOpen]);

  // Focus handling
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement;
      setTimeout(() => {
        titleRef.current?.focus();
      }, 0);
      const onKey = (e) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    } else if (previouslyFocused.current) {
      // return focus
      previouslyFocused.current.focus?.();
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const submit = () => {
    if (!title.trim()) {
      setError('Please provide a title to continue.');
      titleRef.current?.focus();
      return;
    }
    onSave({
      title: title.trim(),
      content,
    });
  };

  const id = 'note-modal';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      onMouseDown={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id={`${id}-title`} className="modal-title">
            {initial ? 'Edit Note' : 'New Note'}
          </h2>
          <button
            className="btn secondary"
            onClick={onCancel}
            aria-label="Close modal"
            ref={closeRef}
          >
            ✕ Close
          </button>
        </div>
        <div className="modal-body">
          {error ? (
            <div className="alert" role="alert" aria-live="assertive" style={{ marginBottom: 12 }}>
              {error}
            </div>
          ) : null}
          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Title <span className="text-muted">(required)</span></div>
              <input
                ref={titleRef}
                className="input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Meeting notes"
                aria-required="true"
              />
            </label>
            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Content <span className="text-muted">(markdown/plain text)</span></div>
              <textarea
                className="textarea"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
              />
            </label>
            <div className="helper">Tip: Use markdown syntax to structure your content.</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={submit}>{initial ? 'Save Changes' : 'Create Note'}</button>
        </div>
      </div>
    </div>
  );
}
