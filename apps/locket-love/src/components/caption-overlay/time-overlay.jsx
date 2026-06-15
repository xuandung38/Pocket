// time-overlay.jsx
// Clock caption chip — lucide Clock icon + the time string captured when the
// user selected this overlay (HH:mm). Display-only; no editing or live tick.
import { Clock } from "lucide-react";

export default function TimeOverlay({ overlay }) {
  const { caption } = overlay;
  return (
    <div
      className="caption-chip"
      style={{
        // Live-data widget: Locket-style frosted-white pill with dark text.
        background: "rgba(255,255,255,0.5)",
        color: "#1c1c1e",
        gap: 8,
        maxWidth: "85%",
      }}
    >
      <Clock size={18} style={{ flexShrink: 0 }} />
      {caption && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {caption}
        </span>
      )}
    </div>
  );
}
