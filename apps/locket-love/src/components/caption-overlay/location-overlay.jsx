// location-overlay.jsx
// Location caption chip — map-pin icon + address string from Nominatim
// reverse geocoding. Display-only; the address is snapshotted at pick time.
import { MapPin } from "lucide-react";

export default function LocationOverlay({ overlay }) {
  const { caption } = overlay;
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
      <MapPin size={18} style={{ flexShrink: 0 }} />
      {caption && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {caption}
        </span>
      )}
    </div>
  );
}
