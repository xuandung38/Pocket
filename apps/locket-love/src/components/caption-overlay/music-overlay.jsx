// music-overlay.jsx
// Music caption chip — cover thumbnail + a marquee-scrolling track title (and
// artist when known). Read-only; the marquee uses the CSS `marquee-continuous`
// keyframe in index.css. overlay.music = { title, artist, image, platform }.
export default function MusicOverlay({ overlay }) {
  const music = overlay.music || {};
  const title = overlay.caption || music.title || "Nhạc";
  const label = music.artist ? `${title} — ${music.artist}` : title;

  return (
    <div
      className="caption-chip"
      style={{
        // Music widget: Locket-style frosted-white pill with dark text.
        background: "rgba(255,255,255,0.5)",
        color: "#1c1c1e",
        padding: "6px 14px",
        gap: 8,
        maxWidth: "85%",
      }}
    >
      {music.image && (
        <img
          src={music.image}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
        />
      )}
      <div
        data-testid="music-marquee"
        style={{ position: "relative", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 180 }}
      >
        <span className="caption-marquee" style={{ display: "inline-block" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
