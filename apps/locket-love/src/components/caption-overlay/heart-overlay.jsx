// heart-overlay.jsx
// Filled-heart caption chip for "inlove" type moments. Display-only.
// data-testid="heart-icon" on the Heart element lets tests assert its presence.
import { Heart } from "lucide-react";

export default function HeartOverlay({ overlay }) {
  const { caption } = overlay;
  return (
    <div
      className="caption-chip"
      style={{
        // Live-data widget: Locket-style frosted-white pill; heart keeps its red.
        background: "rgba(255,255,255,0.5)",
        color: "#1c1c1e",
        gap: 8,
        maxWidth: "85%",
      }}
    >
      <Heart
        data-testid="heart-icon"
        size={18}
        fill="#ff3b5c"
        color="#ff3b5c"
        strokeWidth={0}
        style={{ flexShrink: 0 }}
      />
      {caption && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {caption}
        </span>
      )}
    </div>
  );
}
