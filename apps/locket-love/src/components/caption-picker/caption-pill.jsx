import CaptionOverlay from "../caption-overlay/caption-overlay";

// A selectable pill in the caption picker. Renders the overlay exactly as it
// will appear on the photo (reuses the shared <CaptionOverlay> for visual
// parity — special/snow presets show their snow preview here too), wrapped in a
// selectable ring. Clicking forwards the canonical overlay object to onSelect.
export default function CaptionPill({ overlay, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(overlay)}
      aria-pressed={selected}
      style={{
        padding: 3,
        borderRadius: 999,
        border: `2px solid ${selected ? "#fff" : "transparent"}`,
        background: "none",
        cursor: "pointer",
        lineHeight: 0,
        maxWidth: "100%",
      }}
    >
      <CaptionOverlay overlay={overlay} />
    </button>
  );
}
