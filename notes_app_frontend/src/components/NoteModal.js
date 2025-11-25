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
 * - onSave: function called with payload {title, content, tags, drawing?, images[], audio[]} when saving
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

  // Voice notes state
  const [audioClips, setAudioClips] = useState(Array.isArray(initial?.audio) ? initial.audio : []);
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordStart, setRecordStart] = useState(null);
  const [recordMillis, setRecordMillis] = useState(0);
  const [recorderState, setRecorderState] = useState({ mediaRecorder: null, chunks: [] });
  const [isBlocked, setIsBlocked] = useState(false);

  const drawingRef = useRef(null);
  const titleRef = useRef(null);
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);
  const tagInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // audio refs
  const audioInputRef = useRef(null);
  const recordTimerRef = useRef(null);
  const streamRef = useRef(null);

  // Reset form when initial changes or opening
  useEffect(() => {
    setTitle(initial?.title || '');
    setContent(initial?.content || '');
    setTags(Array.isArray(initial?.tags) ? initial.tags : []);
    setTagInput('');
    setError('');
    setDrawing(initial?.drawing || null);
    setImages(Array.isArray(initial?.images) ? initial.images : []);
    setAudioClips(Array.isArray(initial?.audio) ? initial.audio : []);
    // auto-open sections if content exists
    setSketchOpen(!!(initial && initial.drawing));
    setAttachOpen(!!(initial && Array.isArray(initial.images) && initial.images.length));
    setAudioOpen(!!(initial && Array.isArray(initial.audio) && initial.audio.length));
    // reset recorder flags
    setIsRecording(false);
    setIsBlocked(false);
    setAudioError('');
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

  useEffect(() => {
    // live timer for recording
    if (!isRecording) {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      return;
    }
    recordTimerRef.current = setInterval(() => {
      if (recordStart) {
        setRecordMillis(Date.now() - recordStart);
      }
    }, 250);
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    };
  }, [isRecording, recordStart]);

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

  // Audio limits and utils
  const MAX_AUDIO_FILES = 10;
  const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB per clip limit (dataURL size may be larger string-wise)
  const MAX_RECORD_MILLIS = 10 * 60 * 1000; // 10 minutes
  const AUDIO_ACCEPT = [
    'audio/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-m4a',
    '.m4a',
  ].join(',');

  function msToClock(ms) {
    if (!ms || ms < 0) return '00:00';
    const total = Math.floor(ms / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function pickSupportedMime() {
    const candidates = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return '';
  }

  async function ensureMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsBlocked(false);
      return stream;
    } catch (err) {
      setIsBlocked(true);
      throw err;
    }
  }

  function stopStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach(t => t.stop());
  }

  async function startRecording() {
    setAudioError('');
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setAudioError('Recording is not supported in this browser. Please use a modern browser over HTTPS.');
      return;
    }
    if (audioClips.length >= MAX_AUDIO_FILES) {
      setAudioError(`You have reached the limit of ${MAX_AUDIO_FILES} audio clips for this note.`);
      return;
    }
    try {
      const stream = await ensureMicPermission();
      streamRef.current = stream;
      const type = pickSupportedMime();
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      const chunks = [];
      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      mediaRecorder.onerror = () => {
        setAudioError('A recording error occurred.');
      };
      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
          if (blob.size > MAX_AUDIO_BYTES) {
            setAudioError('Recorded clip is too large. Please record a shorter clip.');
            stopStream(streamRef.current);
            streamRef.current = null;
            return;
          }
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Read error'));
            reader.readAsDataURL(blob);
          });
          const duration = recordStart ? Math.round((Date.now() - recordStart) / 1000) : undefined;
          const id = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
          const clip = {
            id,
            name: `Voice ${new Date().toLocaleString()}`,
            type: blob.type || 'audio/webm',
            dataUrl: typeof dataUrl === 'string' ? dataUrl : '',
            duration,
            createdAt: Date.now(),
          };
          setAudioClips(prev => [...prev, clip]);
        } catch {
          setAudioError('Failed to process the recorded audio.');
        } finally {
          stopStream(streamRef.current);
          streamRef.current = null;
        }
      };
      setRecorderState({ mediaRecorder, chunks });
      mediaRecorder.start();
      setIsRecording(true);
      setRecordStart(Date.now());
      setRecordMillis(0);
      // Safety stop after max duration
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') stopRecording();
        if (recordMillis >= MAX_RECORD_MILLIS) {
          setAudioError('Recording reached the 10-minute limit and was stopped.');
        }
      }, MAX_RECORD_MILLIS + 500);
    } catch (err) {
      if (isBlocked) {
        setAudioError('Microphone permission was denied or blocked. Please allow microphone access in your browser settings.');
      } else {
        setAudioError('Unable to start recording. Check microphone permissions and try again.');
      }
    }
  }

  function stopRecording() {
    try {
      if (recorderState.mediaRecorder && recorderState.mediaRecorder.state === 'recording') {
        recorderState.mediaRecorder.stop();
      }
    } catch {
      // ignore
    } finally {
      setIsRecording(false);
      setRecordStart(null);
    }
  }

  async function handleAudioFiles(fileList) {
    setAudioError('');
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (audioClips.length + files.length > MAX_AUDIO_FILES) {
      setAudioError(`Too many audio files. Maximum is ${MAX_AUDIO_FILES}.`);
      return;
    }
    const allowed = ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/aac'];
    const toAdd = [];
    for (const f of files) {
      if (f.size > MAX_AUDIO_BYTES) {
        setAudioError(prev => `${prev ? prev + ' • ' : ''}${f.name} is too large (max 10MB).`);
        continue;
      }
      if (!(allowed.includes(f.type) || /\.m4a$/i.test(f.name))) {
        setAudioError(prev => `${prev ? prev + ' • ' : ''}Unsupported type: ${f.name}`);
        continue;
      }
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(f);
        });
        toAdd.push({
          id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          name: f.name,
          type: f.type || 'audio/*',
          dataUrl: String(dataUrl),
          createdAt: Date.now(),
        });
      } catch {
        // skip failed file
      }
    }
    if (toAdd.length) {
      setAudioClips(prev => [...prev, ...toAdd]);
    }
  }

  function removeClip(id) {
    setAudioClips(prev => prev.filter(a => a.id !== id));
  }

  function renameClip(id, name) {
    setAudioClips(prev => prev.map(a => (a.id === id ? { ...a, name } : a)));
  }

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
    if (isRecording) {
      // Prevent accidental save while recording
      setAudioError('Please stop the recording before saving.');
      return;
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
      audio: Array.isArray(audioClips) ? audioClips : [],
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
                        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
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
                    style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }}
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

            {/* Voice Notes Section */}
            <div className="card" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setAudioOpen(v => !v)}
                  aria-expanded={audioOpen}
                  aria-controls="audio-section"
                  title={audioOpen ? 'Hide voice notes' : 'Show voice notes'}
                >
                  {audioOpen ? '▾' : '▸'} Voice Notes
                </button>
                {!audioOpen && audioClips.length > 0 ? (
                  <div className="helper" aria-hidden="true">🎙 {audioClips.length}</div>
                ) : null}
              </div>
              {audioOpen ? (
                <div id="audio-section" style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  <div className={`audio-recorder ${isRecording ? 'recording' : ''}`} role="group" aria-label="Voice recorder controls" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span aria-live="polite" className="helper" title="Recording timer">
                        {isRecording ? '● Recording' : 'Ready'} · {msToClock(recordMillis)}
                      </span>
                      {isBlocked ? (
                        <span className="helper" role="alert">Microphone permission blocked.</span>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!isRecording ? (
                        <button
                          type="button"
                          className="btn"
                          onClick={startRecording}
                          aria-label="Start recording"
                          title="Start recording"
                        >
                          ⏺ Record
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn danger"
                          onClick={stopRecording}
                          aria-label="Stop recording"
                          title="Stop recording"
                        >
                          ⏹ Stop
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => audioInputRef.current?.click()}
                        aria-label="Upload audio files"
                        title="Upload audio files"
                      >
                        ⤒ Upload
                      </button>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept={AUDIO_ACCEPT}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length) {
                            handleAudioFiles(e.target.files);
                            e.target.value = '';
                          }
                        }}
                        style={{ display: 'none' }}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                    </div>
                  </div>
                  {audioError ? (
                    <div className="alert" role="alert" aria-live="assertive">
                      {audioError}
                    </div>
                  ) : null}
                  {audioClips.length > 0 ? (
                    <div className="audio-list" aria-live="polite" style={{ display: 'grid', gap: 8 }}>
                      {audioClips.map((a) => (
                        <AudioClipRow
                          key={a.id}
                          clip={a}
                          onDelete={() => removeClip(a.id)}
                          onRename={(name) => renameClip(a.id, name)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="helper">No voice notes yet. Record a clip or upload an audio file (webm, mp3, mp4/m4a, wav).</div>
                  )}
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

// PUBLIC_INTERFACE
function AudioClipRow({ clip, onDelete, onRename }) {
  /** Renders a single audio clip row with play/pause, rename, and delete. */
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [name, setName] = useState(clip.name || 'audio');
  const [localDuration, setLocalDuration] = useState(clip.duration || 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setPlaying(false);
    const onLoaded = () => {
      if (!clip.duration && el.duration && isFinite(el.duration)) {
        setLocalDuration(Math.round(el.duration));
      }
    };
    el.addEventListener('ended', onEnded);
    el.addEventListener('loadedmetadata', onLoaded);
    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [clip.duration]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        // ignore
      }
    }
  };

  const fmt = (s) => {
    if (!s || s < 0) return '00:00';
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(Math.floor(s % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="card" style={{ padding: 8, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center' }}>
      <button
        type="button"
        className="btn secondary"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸ Pause' : '▶️ Play'}
      </button>
      <div style={{ display: 'grid', gap: 6 }}>
        <input
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onRename(e.target.value);
          }}
          aria-label="Rename clip"
        />
        <div className="helper">{fmt(localDuration)}</div>
      </div>
      <button
        type="button"
        className="btn danger"
        onClick={onDelete}
        aria-label="Delete"
        title="Delete"
      >
        🗑
      </button>
      <audio ref={audioRef} src={clip.dataUrl} preload="metadata" style={{ display: 'none' }} />
    </div>
  );
}
