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
 * - onSave: function called with payload {title, content, tags} when saving
 */
export default function NoteModal({ isOpen, initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [tags, setTags] = useState(Array.isArray(initial?.tags) ? initial.tags : []);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);
  const tagInputRef = useRef(null);

  // Reset form when initial changes or opening
  useEffect(() => {
    setTitle(initial?.title || '');
    setContent(initial?.content || '');
    setTags(Array.isArray(initial?.tags) ? initial.tags : []);
    setTagInput('');
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

  const addTagToken = (raw) => {
    if (typeof raw !== 'string') return;
    const cleaned = raw.trim();
    if (!cleaned) return;
    // Preserve case; avoid duplicates (case-sensitive compare to preserve natural style)
    if (tags.includes(cleaned)) return;
    setTags(prev => [...prev, cleaned]);
  };

  const onTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const parts = tagInput.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        parts.forEach(addTagToken);
        setTagInput('');
      }
    } else if (e.key === 'Backspace' && !tagInput) {
      // quick remove last tag
      setTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (value) => {
    setTags(prev => prev.filter(t => t !== value));
  };

  const submit = () => {
    if (!title.trim()) {
      setError('Please provide a title to continue.');
      titleRef.current?.focus();
      return;
    }
    // If user typed something but didn't press enter/comma, add it
    if (tagInput.trim()) {
      addTagToken(tagInput);
      setTagInput('');
    }
    onSave({
      title: title.trim(),
      content,
      tags,
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
            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                Tags <span className="text-muted">(optional)</span>
              </div>
              <div className="tag-input-wrap">
                <div className="tag-chips" aria-live="polite">
                  {tags.map(t => (
                    <span className="chip" key={t}>
                      <span className="chip-label">{t}</span>
                      <button
                        type="button"
                        className="chip-remove"
                        aria-label={`Remove tag ${t}`}
                        title="Remove tag"
                        onClick={() => removeTag(t)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    className="input tag-input"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagKeyDown}
                    placeholder={tags.length ? 'Add tag…' : 'e.g. work, personal'}
                    aria-label="Add tags (comma or Enter to add)"
                  />
                </div>
                <div className="helper" style={{ marginTop: 6 }}>
                  Press Enter or comma to add. Empty tokens are ignored. Duplicate tags are not added.
                </div>
              </div>
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
