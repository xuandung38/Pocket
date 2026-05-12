// Circular avatar with fallback initial
export default function Avatar({ src, name, size = 36, className = "" }) {
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        background: "var(--bg-elevated)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        color: "var(--text-secondary)",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
