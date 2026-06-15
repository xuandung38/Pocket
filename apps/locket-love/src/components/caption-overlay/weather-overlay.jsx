// weather-overlay.jsx
// Weather caption chip — API icon (protocol-relative URL → prepend https:) + temperature label.
// The icon's onError handler hides the broken-image glyph if the CDN URL expires,
// matching the same pattern used by image-icon-overlay.jsx.
export default function WeatherOverlay({ overlay }) {
  const { caption } = overlay;
  // Compose carries the weather object as `weatherData`; on the feed it arrives
  // as `payload` (payload-services maps weatherData → optionsData.payload, which
  // the API echoes back as overlays.payload). Read either so both paths render.
  const weatherData = overlay.weatherData ?? overlay.payload;

  // Weather API returns protocol-relative icon URLs (//cdn.weatherapi.com/…)
  const iconSrc = weatherData?.icon
    ? weatherData.icon.startsWith("//")
      ? `https:${weatherData.icon}`
      : weatherData.icon
    : null;

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
      {iconSrc && (
        <img
          src={iconSrc}
          alt={weatherData?.condition || "weather"}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }}
        />
      )}
      {caption && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {caption}
        </span>
      )}
    </div>
  );
}
