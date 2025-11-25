import React, { useEffect, useMemo, useState } from 'react';

/**
 * Floating scroll controls for a scrollable container.
 * - Shows "scroll to bottom" and "back to top" buttons depending on current position.
 * - Smoothly scrolls the target container using element.scrollTo with behavior: 'smooth'.
 *
 * Props:
 * - targetRef: React ref to the scrollable container element (required)
 * - offsetBottom?: number (px, default 16) distance from bottom of viewport
 * - offsetRight?: number (px, default 16) distance from right of viewport
 * - className?: string
 *
 * Accessibility:
 * - Buttons have aria-labels and titles.
 * - Hidden when no scrolling is possible.
 */
// PUBLIC_INTERFACE
export default function ScrollControls({ targetRef, offsetBottom = 16, offsetRight = 16, className = '' }) {
  const [canScroll, setCanScroll] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  // observe target scroll and size to update state
  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;

    const update = () => {
      const scrollable = el.scrollHeight > el.clientHeight + 2;
      setCanScroll(scrollable);
      const top = el.scrollTop <= 2;
      const bottom = Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) <= 2;
      setAtTop(top);
      setAtBottom(bottom);
    };

    update();

    const onScroll = () => update();
    el.addEventListener('scroll', onScroll);

    // Resize observer to catch content size changes
    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    // Also listen for children mutations in case of dynamic content
    const mo = new MutationObserver(() => update());
    mo.observe(el, { childList: true, subtree: true, attributes: true, characterData: false });

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, [targetRef]);

  const showTop = useMemo(() => canScroll && !atTop, [canScroll, atTop]);
  const showBottom = useMemo(() => canScroll && !atBottom, [canScroll, atBottom]);

  if (!canScroll) return null;

  const scrollTop = () => {
    const el = targetRef?.current;
    if (!el) return;
    try {
      el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch {
      el.scrollTop = 0;
    }
  };

  const scrollBottom = () => {
    const el = targetRef?.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, left: 0, behavior: 'smooth' });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  };

  return (
    <div
      className={`scroll-controls ${className}`}
      style={{
        position: 'fixed',
        right: offsetRight,
        bottom: offsetBottom,
        display: 'grid',
        gap: 8,
        zIndex: 40,
      }}
      aria-hidden={!(showTop || showBottom)}
    >
      {showTop ? (
        <button
          type="button"
          className="btn secondary scroll-btn"
          onClick={scrollTop}
          aria-label="Back to top"
          title="Back to top"
          style={{ padding: '8px 10px', borderRadius: 999 }}
        >
          ⬆ Back to top
        </button>
      ) : null}
      {showBottom ? (
        <button
          type="button"
          className="btn scroll-btn"
          onClick={scrollBottom}
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
          style={{ padding: '8px 10px', borderRadius: 999 }}
        >
          ⬇ Scroll to bottom
        </button>
      ) : null}
    </div>
  );
}
