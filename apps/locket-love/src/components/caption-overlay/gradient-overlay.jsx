// Themed caption — linear-gradient pill from color_top → color_bottom with the
// preset's text color. Covers custome/background/decorative presets and is the
// safe fallback for unknown/not-yet-implemented types.
export default function GradientOverlay({ overlay }) {
  const { caption, icon, color_top, color_bottom, text_color } = overlay;
  const top = color_top || "rgba(0,0,0,0.5)";
  const bottom = color_bottom || top;
  const background =
    top !== bottom ? `linear-gradient(to bottom, ${top}, ${bottom})` : top;
  const label = icon ? `${icon} ${caption || ""}`.trim() : caption || "";

  return (
    <div
      className="caption-chip"
      style={{
        background,
        color: text_color || "#fff",
        backdropFilter: "blur(10px)",
        fontSize: 15,
        fontWeight: 600,
        padding: "8px 18px",
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
