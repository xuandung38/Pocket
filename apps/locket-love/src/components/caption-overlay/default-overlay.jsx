// Plain-text caption — dark translucent pill. Mirrors the original compose pill
// and the feed caption bar so existing moments look unchanged. An emoji icon (if
// present) is prefixed inline.
export default function DefaultOverlay({ overlay }) {
  const { caption, icon, text_color } = overlay;
  const label = icon ? `${icon} ${caption || ""}`.trim() : caption || "";

  return (
    <div
      className="caption-chip"
      style={{
        // Plain text caption: Locket-style dark frosted pill, white text.
        background: "rgba(0,0,0,0.45)",
        color: text_color || "#fff",
        fontWeight: 700,
        maxWidth: "85%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}
