import React, { useEffect, useRef, useState } from 'react';
import DrawingCanvas from './DrawingCanvas';

/**
 * Accessible modal for creating and editing notes.
 * - Focuses the title field on open and returns focus to trigger on close
 * - Esc closes, Enter on buttons
 *
 * Props:
 * - isOpen: boolean to control modal visibility
 * - initial: optional note object to prefill when editing; if falsy, modal acts in "create" mode
 * - onCancel: function called when closing without saving
 * - onSave: function called with payload {title, content, tags, drawing?, images[]} when saving
 */
export default function NoteModal({ isOpen, initial, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [tags, setTags] = useState(Array.isArray(initial?.tags) ? initial.tags : []);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [sketchOpen, setSketchOpen] = useState(false);
  const [drawing, setDrawing] = useState(initial?.drawing || null);

  // Attachments state
  const [images, setImages] = useState(Array.isArray(initial?.images) ? initial.images : []);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachError, setAttachError] = useState('');

  const drawingRef = useRef(null);
  const titleRef = useRef(null);
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);
  const tagInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // Reset form when initial changes or opening
  useEffect(() => {
    setTitle(initial?.title || '');
    setContent(initial?.content || '');
    setTags(Array.isArray(initial?.tags) ? initial.tags : []);
    setTagInput('');
    setError('');
    setDrawing(initial?.drawing || null);
    setImages(Array.isArray(initial?.images) ? initial.images : []);
    // auto-open sections if content exists
    setSketchOpen(!!(initial && initial.drawing));
    setAttachOpen(!!(initial && Array.isArray(initial.images) && initial.images.length));
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

  // Attachment helpers
  const MAX_FILES = 10;
  const MAX_BYTES_BEFORE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

  function bytesToStr(n) {
    if (!n && n !== 0) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async function resizeImageIfNeeded(dataUrl, type, maxEdge = 1600, quality = 0.85) {
    // Skip resize for GIF to preserve animation frames
    if (type === 'image/gif') return dataUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const longEdge = Math.max(width, height);
        if (longEdge <= maxEdge) {
          resolve(dataUrl);
          return;
        }
        const ratio = maxEdge / longEdge;
        const targetW = Math.round(width * ratio);
        const targetH = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outType = type === 'image/png' ? 'image/png' : 'image/jpeg';
        const out = canvas.toDataURL(outType, quality);
        resolve(out);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function validateFiles(files) {
    const problems = [];
    const valid = [];
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        problems.push(`Unsupported type: ${f.name}`);
        continue;
      }
      if (f.size > MAX_BYTES_BEFORE) {
        problems.push(`File too large (>5MB): ${f.name}`);
        continue;
      }
      valid.push(f);
    }
    return { problems, valid };
  }

  async function handleFiles(selected) {
    setAttachError('');
    const list = Array.from(selected || []);
    const { problems, valid } = validateFiles(list);
    if (problems.length) {
      setAttachError(problems.join(' • '));
    }
    if (valid.length === 0) return;

    if (images.length + valid.length > MAX_FILES) {
      setAttachError(prev => `${prev ? prev + ' • ' : ''}Too many images (max ${MAX_FILES}).`);
      return;
    }

    const processed = [];
    for (const f of valid) {
      try {
        const rawUrl = await readFileAsDataUrl(f);
        const optimized = await resizeImageIfNeeded(rawUrl, f.type);
        processed.push({
          id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          name: f.name,
          type: f.type,
          dataUrl: optimized,
          size: f.size,
        });
      } catch {
        // skip file on error
      }
    }
    if (processed.length) {
      setImages(prev => [...prev, ...processed]);
    }
  }

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length) {
      handleFiles(e.target.files);
      // reset input to allow re-adding same file
      e.target.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length) handleFiles(files);
    dropRef.current?.classList.remove('dragover');
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.add('dragover');
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('dragover');
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const moveImageUp = (index) => {
    if (index <= 0) return;
    setImages(prev => {
      const copy = prev.slice();
      const tmp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = tmp;
      return copy;
    });
  };
  const moveImageDown = (index) => {
    setImages(prev => {
      if (index >= prev.length - 1) return prev;
      const copy = prev.slice();
      const tmp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = tmp;
      return copy;
    });
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
    // if a canvas ref exists, retrieve current image; else use drawing state
    let dataUrl = drawing;
    if (drawingRef.current && typeof drawingRef.current.getDataUrl === 'function') {
      dataUrl = drawingRef.current.getDataUrl();
    }
    onSave({
      title: title.trim(),
      content,
      tags,
      drawing: dataUrl || null,
      images: Array.isArray(images) ? images : [],
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

            {/* Attachments Section */}
            <div className="card" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setAttachOpen(v => !v)}
                  aria-expanded={attachOpen}
                  aria-controls="attachments-section"
                  title={attachOpen ? 'Hide attachments' : 'Show attachments'}
                >
                  {attachOpen ? '▾' : '▸'} Attachments
                </button>
                {!attachOpen && images.length > 0 ? (
                  <div className="attachments-ribbon" aria-hidden="true" style={{ display: 'flex', gap: 6 }}>
                    {images.slice(0, 3).map(img => (
                      <img
                        key={img.id}
                        src={img.dataUrl}
                        alt=""
                        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                      />
                    ))}
                    {images.length > 3 ? <span className="helper">+{images.length - 3} more</span> : null}
                  </div>
                ) : null}
              </div>
              {attachOpen ? (
                <div id="attachments-section" style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  <div
                    ref={dropRef}
                    className="attachments-dropzone"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    role="button"
                    tabIndex={0}
                    aria-label="Drop images here"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Drag & Drop images here</div>
                      <div className="helper">or</div>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Choose image files"
                        style={{ marginTop: 6 }}
                      >
                        Select Images
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={onFileChange}
                        aria-label="Add image attachments"
                        style={{ display: 'none' }}
                      />
                      <div className="helper" style={{ marginTop: 6 }}>
                        Up to {MAX_FILES} images. Max 5MB each. Supported: png, jpg, jpeg, webp, gif. Images may be resized to ~1600px.
                      </div>
                    </div>
                  </div>

                  {attachError ? (
                    <div className="alert" role="alert" aria-live="assertive">
                      {attachError}
                    </div>
                  ) : null}

                  {images.length > 0 ? (
                    <div className="attachments-grid" aria-live="polite">
                      {images.map((img, idx) => (
                        <div key={img.id} className="attachment-card">
                          <div className="attachment-thumb">
                            <img src={img.dataUrl} alt={img.name || 'Attachment'} />
                          </div>
                          <div className="attachment-meta">
                            <div className="attachment-name" title={img.name}>{img.name}</div>
                            <div className="attachment-size helper">{bytesToStr(img.size)}</div>
                          </div>
                          <div className="attachment-actions">
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => moveImageUp(idx)}
                              aria-label={`Move ${img.name} up`}
                              title="Move up"
                              disabled={idx === 0}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => moveImageDown(idx)}
                              aria-label={`Move ${img.name} down`}
                              title="Move down"
                              disabled={idx === images.length - 1}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="btn danger"
                              onClick={() => removeImage(img.id)}
                              aria-label={`Remove ${img.name}`}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="helper">No images attached yet.</div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Sketch Section */}
            <div className="card" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setSketchOpen(v => !v)}
                  aria-expanded={sketchOpen}
                  aria-controls="sketch-section"
                  title={sketchOpen ? 'Hide sketch' : 'Show sketch'}
                >
                  {sketchOpen ? '▾' : '▸'} Sketch
                </button>
                {!sketchOpen && drawing ? (
                  <img
                    src={drawing}
                    alt="Sketch thumbnail"
                    style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)' }}
                  />
                ) : null}
              </div>
              {sketchOpen ? (
                <div id="sketch-section" style={{ marginTop: 10 }}>
                  <DrawingCanvas
                    ref={drawingRef}
                    initialDataUrl={drawing || null}
                    onChange={(data) => setDrawing(data || null)}
                    height={260}
                  />
                  <div className="helper" style={{ marginTop: 6 }}>
                    Draw with mouse, touch, or stylus. Use pen/eraser, adjust color and width, undo/redo, or clear.
                  </div>
                </div>
              ) : null}
            </div>
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
