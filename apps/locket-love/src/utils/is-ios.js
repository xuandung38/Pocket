// Platform detection utilities.
// iPadOS 13+ reports "MacIntel" + maxTouchPoints > 1 — we detect that edge case
// so the camera can correctly branch iOS/Android even on newer iPads.

export function isIOS() {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;

  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    // iPadOS 13+ masquerades as desktop Mac but exposes touch points
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid() {
  if (typeof window === "undefined") return false;

  return /Android/i.test(navigator.userAgent);
}
