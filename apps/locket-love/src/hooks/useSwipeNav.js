import { useCallback, useRef } from "react";

// Minimum px movement on either axis to register as a swipe.
const THRESHOLD = 50;

// Touch-driven nav: swipe in cardinal directions to switch between sibling screens.
// Mirrors the iOS-style edge slide used by Locket — only valid neighbors transition
// from any given screen, anything else is ignored.
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

      // Reject taps / micro-drags below threshold on both axes.
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      const isHoriz = Math.abs(dx) > Math.abs(dy);

      if (navState === "camera") {
        // Up from camera → feed
        if (!isHoriz && dy < -THRESHOLD) setNavState("feed");
        // Messages sits left of camera (translateX(-100%)) → swipe RIGHT reveals it.
        else if (isHoriz && dx > THRESHOLD) setNavState("messages");
        // Profile sits right of camera (translateX(+100%)) → swipe LEFT reveals it.
        else if (isHoriz && dx < -THRESHOLD) setNavState("profile");
      } else if (navState === "feed") {
        // Swipe DOWN returns to camera; swipe-up is reserved for internal scroll-snap.
        if (!isHoriz && dy > THRESHOLD) setNavState("camera");
      } else if (navState === "messages") {
        // Reverse the entry gesture (swipe-right entered) to dismiss.
        if (isHoriz && dx < -THRESHOLD) setNavState("camera");
      } else if (navState === "profile") {
        // Reverse the entry gesture (swipe-left entered) to dismiss.
        if (isHoriz && dx > THRESHOLD) setNavState("camera");
      } else if (navState === "activity") {
        // Activity reached via tab; swipe down back to camera as a default exit.
        if (!isHoriz && dy > THRESHOLD) setNavState("camera");
      }
    },
    [navState, setNavState],
  );

  return { onTouchStart, onTouchEnd };
}
