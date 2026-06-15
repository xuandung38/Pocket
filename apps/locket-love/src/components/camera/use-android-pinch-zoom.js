// Pinch-to-zoom hook for the Android camera preview.
// Handles two-finger touch events and applies zoom via track.applyConstraints().
// Throttled to PINCH_THROTTLE_MS to avoid flooding the browser's constraint queue.

import { useCallback, useRef } from "react";

const PINCH_THROTTLE_MS = 40;

/**
 * @param {{
 *   streamRef:       React.RefObject<MediaStream|null>,
 *   currentZoomValue: React.RefObject<number>,
 *   onZoomValue:     (value: number) => Promise<void>,
 * }} params
 */
export function useAndroidPinchZoom({ streamRef, currentZoomValue, onZoomValue }) {
  const pinchRef = useRef({ active: false, distance: 0, zoomAtStart: 1 });
  const lastPinchUpdate = useRef(0);

  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const [a, b] = touches;
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const resetPinch = useCallback(() => {
    pinchRef.current = {
      active: false,
      distance: 0,
      zoomAtStart: currentZoomValue.current,
    };
  }, [currentZoomValue]);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 2) return;
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track?.getCapabilities?.()?.zoom) return;
    e.preventDefault();
    pinchRef.current = {
      active: true,
      distance: getTouchDistance(e.touches),
      zoomAtStart: currentZoomValue.current,
    };
  }, [streamRef, currentZoomValue]);

  const handleTouchMove = useCallback(async (e) => {
    if (!pinchRef.current.active || e.touches.length !== 2) return;
    const now = Date.now();
    if (now - lastPinchUpdate.current < PINCH_THROTTLE_MS) return;
    const dist = getTouchDistance(e.touches);
    if (!dist || !pinchRef.current.distance) return;
    e.preventDefault();
    lastPinchUpdate.current = now;
    const scale = dist / pinchRef.current.distance;
    try {
      await onZoomValue(pinchRef.current.zoomAtStart * scale);
    } catch (err) {
      console.warn("[use-android-pinch-zoom] pinch zoom failed:", err);
    }
  }, [onZoomValue]);

  const handleTouchEnd = useCallback(() => {
    resetPinch();
  }, [resetPinch]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
