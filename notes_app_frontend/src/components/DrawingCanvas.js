import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

/**
 * DrawingCanvas
 * HTML5 canvas with Pointer Events supporting:
 * - pen/eraser modes
 * - color picker, stroke width
 * - pressure (if available)
 * - undo/redo (per path)
 * - clear
 * - load/save from/to dataURL
 *
 * Props:
 * - initialDataUrl?: string (optional initial drawing to load)
 * - onChange?: (dataUrl: string | null) => void (called after each commit/clear)
 * - height?: number (canvas height, responsive width by parent)
 * - className?: string
 *
 * Exposed methods via ref:
 * - getDataUrl(): string | null
 * - loadDataUrl(url: string | null): void
 * - clear(): void
 *
 * Notes:
 * - Uses an internal offscreen canvas (same el) and replays "paths" for undo/redo
 * - A "path" is an array of points with stroke settings and mode
 */

// PUBLIC_INTERFACE
const DrawingCanvas = forwardRef(function DrawingCanvas(
  { initialDataUrl = null, onChange, height = 260, className = '' },
  ref
) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const ctxRef = useRef(null);

  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [color, setColor] = useState('#111827');
  const [width, setWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);

  // History
  const [paths, setPaths] = useState([]); // array of path objects
  const [redoStack, setRedoStack] = useState([]);

  // Current path being drawn
  const currentPathRef = useRef(null);

  // Resize observer to fit width of container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const parent = wrapperRef.current;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = parent.clientWidth;
      const cssHeight = height;
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;
      // redraw when resizing
      redraw();
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // Load initial drawing if provided
  useEffect(() => {
    if (!initialDataUrl) return;
    loadDataUrl(initialDataUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataUrl]);

  useImperativeHandle(ref, () => ({
    // PUBLIC_INTERFACE
    getDataUrl() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      // if no paths, treat as empty
      if (!paths.length) return null;
      return canvas.toDataURL('image/png');
    },
    // PUBLIC_INTERFACE
    loadDataUrl(url) {
      loadDataUrl(url);
    },
    // PUBLIC_INTERFACE
    clear() {
      doClear();
    },
  }));

  function getPointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = typeof e.pressure === 'number' && e.pressure > 0 ? e.pressure : 1;
    return { x, y, pressure };
  }

  function startDraw(e) {
    e.preventDefault();
    const pos = getPointerPos(e);
    setIsDrawing(true);
    const newPath = {
      tool,
      color,
      width,
      points: [pos],
    };
    currentPathRef.current = newPath;
    setRedoStack([]); // clear redo on new action
  }

  function moveDraw(e) {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    const cp = currentPathRef.current;
    cp.points.push(pos);
    drawLiveSegment(cp);
  }

  function endDraw() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (!currentPathRef.current) return;
    const finished = currentPathRef.current;
    currentPathRef.current = null;
    setPaths(prev => {
      const next = [...prev, finished];
      // after commit, redraw full to ensure clean result
      setTimeout(() => {
        redraw(next);
        // emit change
        if (onChange) {
          const url = next.length ? canvasRef.current.toDataURL('image/png') : null;
          onChange(url);
        }
      }, 0);
      return next;
    });
  }

  // Draw a single path fully on ctx
  function strokePath(ctx, path) {
    const pts = path.points;
    if (!pts || pts.length < 1) return;
    if (path.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = path.color || '#111827';
    }
    ctx.lineWidth = Math.max(0.5, path.width || 2);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    // For pressure: could vary width per segment, but simple pass uses base width.
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function redraw(sourcePaths = paths) {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sourcePaths.forEach(p => strokePath(ctx, p));
  }

  function drawLiveSegment(path) {
    // Instead of drawing incrementally, we draw whole state for simplicity to avoid gaps
    redraw([...paths, path]);
  }

  function undo() {
    if (isDrawing) return;
    if (!paths.length) return;
    const newPaths = paths.slice(0, -1);
    const popped = paths[paths.length - 1];
    setPaths(newPaths);
    setRedoStack(prev => [...prev, popped]);
    setTimeout(() => {
      redraw(newPaths);
      if (onChange) {
        const url = newPaths.length ? canvasRef.current.toDataURL('image/png') : null;
        onChange(url);
      }
    }, 0);
  }

  function redo() {
    if (isDrawing) return;
    if (!redoStack.length) return;
    const restored = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const newPaths = [...paths, restored];
    setPaths(newPaths);
    setRedoStack(newRedo);
    setTimeout(() => {
      redraw(newPaths);
      if (onChange) {
        const url = newPaths.length ? canvasRef.current.toDataURL('image/png') : null;
        onChange(url);
      }
    }, 0);
  }

  function doClear() {
    if (isDrawing) return;
    setPaths([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (onChange) onChange(null);
  }

  function loadDataUrl(url) {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (!url) {
      doClear();
      return;
    }
    const img = new Image();
    img.onload = () => {
      // Clear existing vector paths since we're loading a raster image snapshot.
      setPaths([]);
      setRedoStack([]);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Fit image into canvas maintaining aspect ratio by covering height
      const targetW = canvas.clientWidth;
      const targetH = canvas.clientHeight;
      if (!targetW || !targetH) {
        ctx.drawImage(img, 0, 0);
      } else {
        // draw scaled to fit
        const ratio = Math.min(targetW / img.width, targetH / img.height);
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        const dx = (targetW - dw) / 2;
        const dy = (targetH - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      if (onChange) {
        const data = canvas.toDataURL('image/png');
        onChange(data);
      }
    };
    img.onerror = () => {
      // ignore load errors
    };
    img.src = url;
  }

  // Pointer events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleDown = (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      startDraw(e);
    };
    const handleMove = (e) => moveDraw(e);
    const handleUp = () => endDraw();
    const handleCancel = () => endDraw();

    canvas.addEventListener('pointerdown', handleDown);
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerup', handleUp);
    canvas.addEventListener('pointercancel', handleCancel);
    return () => {
      canvas.removeEventListener('pointerdown', handleDown);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerup', handleUp);
      canvas.removeEventListener('pointercancel', handleCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, color, width, isDrawing, paths]);

  return (
    <div className={`drawing-canvas card`} style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Tool</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`btn secondary ${tool === 'pen' ? 'chip-active' : ''}`}
              onClick={() => setTool('pen')}
              aria-pressed={tool === 'pen'}
              title="Pen"
            >
              ✏️ Pen
            </button>
            <button
              type="button"
              className={`btn secondary ${tool === 'eraser' ? 'chip-active' : ''}`}
              onClick={() => setTool('eraser')}
              aria-pressed={tool === 'eraser'}
              title="Eraser"
            >
              🧽 Eraser
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Color</label>
          <input
            className="input"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Stroke color"
            style={{ width: 44, padding: 0, height: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontWeight: 600 }}>Width</label>
          <input
            type="range"
            min={1}
            max={16}
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value, 10))}
            aria-label="Stroke width"
          />
          <span className="helper">{width}px</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button type="button" className="btn secondary" onClick={undo} aria-label="Undo">↶ Undo</button>
          <button type="button" className="btn secondary" onClick={redo} aria-label="Redo">↷ Redo</button>
          <button type="button" className="btn danger" onClick={doClear} aria-label="Clear canvas">🗑 Clear</button>
        </div>
      </div>
      <div
        ref={wrapperRef}
        className={className}
        style={{
          width: '100%',
          height,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.02), var(--color-surface))',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ touchAction: 'none', display: 'block', width: '100%', height: '100%', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          aria-label="Freehand drawing canvas"
        />
      </div>
    </div>
  );
});

export default DrawingCanvas;
