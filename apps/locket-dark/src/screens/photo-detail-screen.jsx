import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Share2 } from "lucide-react";
import { photoStrips, feedMoments } from "../data/mock-data";

export default function PhotoDetailScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  // Use feedMoments[1] as the large photo source (higher res)
  const largePhoto = feedMoments[1]?.image || photoStrips[currentIndex];

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000" }}>
      {/* Header — pushed down for safe-area breathing room (see docs/design-patterns.md §1.1) */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <X size={20} />
        </button>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          2026 / tháng 5 thứ 10
        </span>
        <button className="icon-btn">
          <Share2 size={20} />
        </button>
      </div>

      {/* Main photo */}
      <div
        style={{
          position: "absolute",
          top: 60,
          bottom: 100,
          left: 16,
          right: 16,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <img
          src={largePhoto}
          alt="photo"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Caption overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "40px 16px 16px",
            background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>My FML</span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>20:11</span>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div
        className="scroll-area"
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          display: "flex",
          gap: 8,
          padding: "0 16px",
          overflowX: "auto",
        }}
      >
        {photoStrips.map((src, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            style={{
              flexShrink: 0,
              width: 56,
              height: 56,
              borderRadius: 10,
              overflow: "hidden",
              border: i === currentIndex ? "2px solid var(--accent-yellow)" : "2px solid transparent",
              padding: 0,
              cursor: "pointer",
              background: "none",
            }}
          >
            <img
              src={src}
              alt={`thumb-${i}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
