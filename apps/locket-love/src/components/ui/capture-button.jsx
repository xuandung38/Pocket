// Yellow-ringed capture button — matches IMG_7924 center button
export default function CaptureButton({ onClick, size = 76 }) {
  const ring = size + 12;

  return (
    <button
      onClick={onClick}
      aria-label="Chụp ảnh"
      style={{
        width: ring,
        height: ring,
        borderRadius: "50%",
        border: "3px solid var(--accent-yellow)",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "transform 0.1s",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#ffffff",
        }}
      />
    </button>
  );
}
