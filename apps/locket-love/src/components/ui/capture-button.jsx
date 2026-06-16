// Yellow-ringed capture button — matches IMG_7924 center button.
// `recording` flips the inner dot to a red stop-square while a video records.
// The -webkit-touch-callout / user-select / tap-highlight resets are required
// because video recording is a press-and-hold gesture: without them iOS Safari
// fires its long-press callout + selection magnifier and paints a dark/garbled
// overlay over the button instead of showing the recording state.
export default function CaptureButton({ onClick, recording = false, size = 76 }) {
  const ring = size + 12;

  return (
    <button
      onClick={onClick}
      aria-label={recording ? "Đang quay video" : "Chụp ảnh"}
      style={{
        width: ring,
        height: ring,
        borderRadius: "50%",
        border: `3px solid ${recording ? "#ff3b30" : "var(--accent-yellow)"}`,
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "transform 0.1s",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        // Kill the iOS Safari focus ring: on a border-radius:50% button it is
        // drawn as a rounded-rectangle whose 4 corners poke out past the circle.
        WebkitAppearance: "none",
        outline: "none",
      }}
    >
      <div
        style={{
          width: recording ? size * 0.5 : size,
          height: recording ? size * 0.5 : size,
          borderRadius: recording ? 8 : "50%",
          background: recording ? "#ff3b30" : "#ffffff",
          transition: "width 0.15s ease, height 0.15s ease, border-radius 0.15s ease, background 0.15s ease",
          pointerEvents: "none",
        }}
      />
    </button>
  );
}
