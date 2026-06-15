// review-overlay.jsx
// Star-rating + quote caption chip. overlay.icon is the numeric rating (0–5);
// overlay.caption is the free-text quote. data-testid attributes on each star
// allow tests to assert filled vs empty counts without relying on CSS.
import { Star } from "lucide-react";

export default function ReviewOverlay({ overlay }) {
  const { icon, caption, text_color } = overlay;
  const rating =
    typeof icon === "number" ? Math.max(0, Math.min(5, Math.round(icon))) : 0;

  return (
    <div
      className="caption-chip"
      style={{
        // Review widget: Locket-style frosted-white pill, dark text, gold stars.
        background: "rgba(255,255,255,0.5)",
        color: "#1c1c1e",
        padding: "8px 16px",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        maxWidth: "85%",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 5 }, (_, i) =>
          i < rating ? (
            <Star
              key={i}
              data-testid="star-filled"
              size={16}
              fill="#f5a623"
              color="#f5a623"
              strokeWidth={0}
            />
          ) : (
            <Star
              key={i}
              data-testid="star-empty"
              size={16}
              fill="none"
              strokeWidth={1.5}
            />
          ),
        )}
      </div>
      {caption && (
        <span
          style={{
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
