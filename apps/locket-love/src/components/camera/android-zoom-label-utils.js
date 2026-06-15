// Pure helpers for Android zoom-label generation and label↔value mapping.
// Separated so they can be unit-tested without importing the full component.

/**
 * Build the set of zoom preset labels supported by the given capability range.
 * @param {{ min?: number, max?: number } | null | undefined} zoomCap
 * @returns {string[]}
 */
export function getZoomLabels(zoomCap) {
  if (!zoomCap) return ["1x"];
  const { min = 1, max = 1 } = zoomCap;
  const labels = [];
  if (min < 1) labels.push("0.5x");
  labels.push("1x");
  if (max >= 2) labels.push("2x");
  if (max >= 3) labels.push("3x");
  return [...new Set(labels)];
}

/**
 * Map a label string to a numeric zoom value clamped to the capability range.
 * @param {string} label
 * @param {{ min?: number, max?: number } | null | undefined} zoomCap
 * @returns {number}
 */
export function labelToZoomValue(label, zoomCap) {
  const min = zoomCap?.min ?? 1;
  const max = zoomCap?.max ?? 1;
  const raw =
    label === "0.5x" ? 0.5
    : label === "2x"  ? 2
    : label === "3x"  ? 3
    : 1;
  return Math.max(min, Math.min(raw, max));
}
