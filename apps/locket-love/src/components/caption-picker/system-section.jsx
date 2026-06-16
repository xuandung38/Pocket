// system-section.jsx
// "Hệ thống" section in the caption picker — a grid of buttons that resolve
// live device data (clock, GPS, battery, weather) into canonical overlays and
// forward them upstream via onSelect. Weather resolves async (geolocation →
// API) tracked with an "awaiting" flag; location opens its own picker sheet.
import { useState, useEffect } from "react";
import { Clock, Cloud, Battery, MapPin, Star, Heart, Flame } from "lucide-react";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";
import { useMemoriesStore } from "@/stores/use-memories-store";
import { useWeather } from "@/hooks/use-weather";
import { useBattery } from "@/hooks/use-battery";
import { SonnerError } from "@/components/ui/sonner-toast";
import ReviewFormSheet from "./review-form-sheet";
import LocationSheet from "./location-sheet";

// Compact tap-target used in the system button grid
function SystemButton({ onClick, icon, label, loading = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.08)",
        color: disabled ? "#666" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 600,
        opacity: loading ? 0.6 : 1,
        minWidth: 66,
      }}
    >
      {icon}
      <span>{loading ? "..." : label}</span>
    </button>
  );
}

export default function SystemSection({ onSelect }) {
  const { weather, loading: wLoading, error: wError, fetchWeather } = useWeather();
  const { level, charging, supported: batterySupported } = useBattery();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  // Flag set when the user taps Weather; cleared once the fetch resolves.
  const [awaitWeather, setAwaitWeather] = useState(false);
  // Streak comes from the memories store (synced from getLatestMoment). Hidden
  // when absent — never show a fake 0.
  const streak = useMemoriesStore((s) => s.streak);

  // Forward the weather overlay once the pending fetch completes
  useEffect(() => {
    if (!awaitWeather || wLoading) return;
    setAwaitWeather(false);
    if (wError) {
      SonnerError("Không lấy được thời tiết");
      return;
    }
    if (weather) {
      onSelect(
        normalizeOverlay({
          type: "weather",
          caption: `${weather.temp_c_rounded}°C`,
          text_color: "#FFFFFF",
          weatherData: weather,
        }),
      );
    }
  }, [awaitWeather, wLoading]); // onSelect omitted — stable during sheet lifetime; including it would require memo on the parent

  const handleTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    onSelect(normalizeOverlay({ type: "time", caption: `${h}:${m}` }));
  };

  const handleWeather = () => {
    setAwaitWeather(true);
    fetchWeather();
  };

  const handleBattery = () => {
    onSelect(
      normalizeOverlay({ type: "battery", caption: String(level ?? 0), icon: charging }),
    );
  };

  const handleHeart = () => {
    onSelect(normalizeOverlay({ type: "heart", caption: "inlove" }));
  };

  const handleStreak = () => {
    if (!streak?.count) return;
    onSelect(
      normalizeOverlay({
        type: "streak",
        caption: String(streak.count),
        icon: "🔥",
        color_top: "#FFB300",
        color_bottom: "#FF6D00",
        text_color: "#FFFFFF",
      }),
    );
  };

  const handleReviewSubmit = ({ rating, text }) => {
    onSelect(normalizeOverlay({ type: "review", icon: rating, caption: text }));
  };

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
        Hệ thống
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <SystemButton onClick={handleTime} icon={<Clock size={20} />} label="Giờ" />
        <SystemButton
          onClick={handleWeather}
          icon={<Cloud size={20} />}
          label="Thời tiết"
          loading={wLoading}
        />
        {/* Battery button is hidden when the API is unsupported (most desktops) */}
        {batterySupported && (
          <SystemButton
            onClick={handleBattery}
            icon={<Battery size={20} />}
            label="Pin"
            disabled={level === null}
          />
        )}
        <SystemButton
          onClick={() => setLocationOpen(true)}
          icon={<MapPin size={20} />}
          label="Vị trí"
        />
        <SystemButton
          onClick={() => setReviewOpen(true)}
          icon={<Star size={20} />}
          label="Đánh giá"
        />
        <SystemButton
          onClick={handleHeart}
          icon={<Heart size={20} fill="currentColor" strokeWidth={0} />}
          label="Tim"
        />
        {/* Streak — only when the memories store has a count (never fake 0) */}
        {streak?.count > 0 && (
          <SystemButton
            onClick={handleStreak}
            icon={<Flame size={20} />}
            label="Streak"
          />
        )}
      </div>

      <ReviewFormSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmit={handleReviewSubmit}
      />

      <LocationSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelect={onSelect}
      />
    </section>
  );
}
