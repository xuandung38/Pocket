// battery-overlay.jsx
// Battery level caption chip. Charging is signalled by overlay.icon — a boolean
// at compose time, or the SF-symbol "bolt.fill" round-tripped from the feed.
// overlay.caption is the level (e.g. "80" or "80%"). Display-only.
import { Battery, BatteryCharging } from "lucide-react";

export default function BatteryOverlay({ overlay }) {
  const { caption, icon: charging } = overlay;
  const isCharging = charging === true || charging === "bolt.fill";
  const BatIcon = isCharging ? BatteryCharging : Battery;
  // Caption may already include a "%" (feed alt_text) — normalise to one.
  const level = String(caption ?? "").replace(/%+\s*$/, "");

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
      <BatIcon size={18} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {level}%
      </span>
    </div>
  );
}
