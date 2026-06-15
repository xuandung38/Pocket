import SnowEffect from "./snow-effect";

// Gradient caption with a falling-snow overlay (winter preset). The snow layer
// is only mounted for type "special", so the particle loop never runs elsewhere.
export default function SpecialSnowOverlay({ overlay }) {
  const { caption, icon, color_top, color_bottom, text_color } = overlay;
  const top = color_top || "rgba(0,0,0,0.5)";
  const bottom = color_bottom || top;
  const background =
    top !== bottom ? `linear-gradient(to bottom, ${top}, ${bottom})` : top;
  const label = icon ? `${icon} ${caption || ""}`.trim() : caption || "";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 9999,
        display: "inline-flex",
        maxWidth: "85%",
      }}
    >
      <div
        className="caption-chip"
        style={{
          background,
          color: text_color || "#fff",
          backdropFilter: "blur(10px)",
          fontSize: 15,
          fontWeight: 600,
          padding: "8px 18px",
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <SnowEffect />
    </div>
  );
}
