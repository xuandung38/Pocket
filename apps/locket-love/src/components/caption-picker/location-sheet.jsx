// location-sheet.jsx
// Location picker — opens from the System section's "Vị trí" button. Shows the
// current GPS address at the top and a search box to find a nearby/other place
// (Nominatim, biased to the user's area). Picking a row emits a location overlay.
import { useState, useEffect } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import BottomSheet from "../sheets/bottom-sheet";
import { useLocation } from "@/hooks/use-location";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

function LocationRow({ label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "12px 8px",
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        cursor: "pointer",
      }}
    >
      <MapPin size={18} style={{ flexShrink: 0, color: "var(--accent-yellow)" }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {hint && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{hint}</span>
        )}
      </span>
    </button>
  );
}

export default function LocationSheet({ open, onClose, onSelect }) {
  const { current, options, loading, searching, fetchCurrent, search } = useLocation();
  const [query, setQuery] = useState("");

  // Geolocate + reverse-geocode when the sheet opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      fetchCurrent();
    }
  }, [open, fetchCurrent]);

  const handleQuery = (e) => {
    const q = e.target.value;
    setQuery(q);
    search(q);
  };

  const pick = (label) => {
    onSelect(normalizeOverlay({ type: "location", caption: label }));
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Vị trí">
      <div style={{ padding: "12px 16px 28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <Search size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          <input
            value={query}
            onChange={handleQuery}
            placeholder="Tìm địa điểm lân cận…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 15,
            }}
          />
          {searching && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
        </div>

        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {/* Current location (hidden once the user starts searching) */}
          {!query && loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px", color: "var(--text-secondary)", fontSize: 14 }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              Đang lấy vị trí…
            </div>
          )}
          {!query && current && (
            <LocationRow label={current.label} hint="Vị trí hiện tại" onClick={() => pick(current.label)} />
          )}

          {/* Search results */}
          {query && options.map((o, i) => (
            <LocationRow key={`${o.label}-${i}`} label={o.label} onClick={() => pick(o.label)} />
          ))}
          {query && !searching && options.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px 0", fontSize: 14 }}>
              Không tìm thấy địa điểm
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
