import { useCallback, useRef } from "react";

const THRESHOLD = 50;

export function useSwipeNav(navState, setNavState) {
  const startRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      const start = startRef.current;
      if (!start) return;
      startRef.current = null;

      const end = e.changedTouches[0];
      const dx = end.clientX - start.x;
      const dy = end.clientY - start.y;

      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      const isHoriz = Math.abs(dx) > Math.abs(dy);

      if (navState === "camera") {
        if (!isHoriz && dy < -THRESHOLD) setNavState("feed");
        // Messages is positioned left (translateX(-100%)) → reveal by swiping RIGHT
        else if (isHoriz && dx > THRESHOLD) setNavState("messages");
        // Profile is positioned right (translateX(+100%)) → reveal by swiping LEFT
        else if (isHoriz && dx < -THRESHOLD) setNavState("profile");
      } else if (navState === "feed") {
        // Only swipe DOWN from feed → camera; swipe-up is internal scroll-snap nav
        if (!isHoriz && dy > THRESHOLD) setNavState("camera");
      } else if (navState === "messages") {
        // Swipe LEFT to go back (reverse of swipe-right entry)
        if (isHoriz && dx < -THRESHOLD) setNavState("camera");
      } else if (navState === "profile") {
        // Swipe RIGHT to go back (reverse of swipe-left entry)
        if (isHoriz && dx > THRESHOLD) setNavState("camera");
      }
    },
    [navState, setNavState],
  );

  return { onTouchStart, onTouchEnd };
}
