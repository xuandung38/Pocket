import { useMemo } from "react";

// Falling-snow particle layer for the winter ("special") caption. Pure CSS
// animation — each flake is a blurred white dot driven by the `fall` keyframe in
// index.css with per-flake `--drift` (horizontal) + `--fall-distance` vars. No
// runtime ticking, so it is cheap; particle count is capped for perf.
export default function SnowEffect({ count = 28, containerHeight = 44 }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        size: Math.random() * 5 + 2,
        left: Math.random() * 100,
        duration: Math.random() * 5 + 3,
        delay: Math.random() * 2,
        drift: (Math.random() - 0.5) * 24,
        startY: -(Math.random() * 30 + 8),
      })),
    [count],
  );

  return (
    <div
      data-testid="snow"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      {flakes.map((f) => (
        <div
          key={f.id}
          style={{
            position: "absolute",
            width: f.size,
            height: f.size,
            left: `${f.left}%`,
            top: f.startY,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.8,
            filter: "blur(1px)",
            willChange: "transform",
            animation: `fall ${f.duration}s linear ${f.delay}s infinite`,
            "--drift": `${f.drift}px`,
            "--fall-distance": `${containerHeight + Math.abs(f.startY) + 16}px`,
          }}
        />
      ))}
    </div>
  );
}
