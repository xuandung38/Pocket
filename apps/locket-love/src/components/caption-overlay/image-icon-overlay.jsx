// Image-icon / GIF caption — a small image (icon URL) next to the text on a
// gradient/translucent pill. Shared by image_icon and image_gif (a GIF is just
// an animated icon URL). Also reused by the Phase 4 image-upload flow.
export default function ImageIconOverlay({ overlay }) {
  const { caption, icon, color_top, color_bottom, text_color } = overlay;
  const top = color_top || "rgba(255,255,255,0.22)";
  const bottom = color_bottom || top;
  const background = `linear-gradient(to bottom, ${top}, ${bottom})`;

  return (
    <div
      className="caption-chip"
      style={{
        background,
        color: text_color || "#fff",
        backdropFilter: "blur(16px)",
        fontSize: 15,
        fontWeight: 600,
        padding: "6px 14px",
        gap: 8,
        maxWidth: "85%",
      }}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          // Hide the broken-image glyph if the icon URL 404s (R2/CDN links can
          // expire) — the caption text still renders.
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          style={{
            width: 24,
            height: 24,
            objectFit: "cover",
            borderRadius: 4,
            flexShrink: 0,
          }}
        />
      )}
      {caption && (
        <span
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
