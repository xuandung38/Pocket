// use-pull-to-refresh.js
// Lightweight pull-to-refresh for a scrollable container (touch-based, mobile).
//
// Arms only when the container is already scrolled to the very top, then tracks
// a downward drag with a rubbery dampening. Releasing past `threshold` fires
// `onRefresh`. Returns the live pull distance (for rendering a spinner) + the
// handlers to spread onto the scroll element.

import { useCallback, useRef, useState } from "react";

export function usePullToRefresh({ onRefresh, threshold = 64, enabled = true }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);

  const onTouchStart = useCallback(
    (e) => {
      if (!enabled) return;
      // Only arm when at the top — otherwise this is a normal scroll.
      if (e.currentTarget.scrollTop > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? null;
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e) => {
      if (startY.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      // Only react to downward drags; dampen + cap for a rubbery feel.
      setPull(dy > 0 ? Math.min(dy * 0.5, threshold * 1.5) : 0);
    },
    [threshold],
  );

  const onTouchEnd = useCallback(() => {
    if (startY.current == null) return;
    if (pull >= threshold) onRefresh?.();
    startY.current = null;
    setPull(0);
  }, [pull, threshold, onRefresh]);

  return {
    pull,
    threshold,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
