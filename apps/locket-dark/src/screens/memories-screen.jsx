import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/ui/avatar";
import BottomNav from "../components/ui/bottom-nav";
import ProfileSheet from "../components/sheets/profile-sheet";
import {
  currentUser,
  memoriesCalendar,
  memoriesMonths,
  memoriesStats,
} from "../data/mock-data";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
// Today (fixed for demo) — used to highlight the current day cell
const TODAY_KEY = "2026-05-10";

// Build calendar grid for a given month (Date object with day=1)
function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return { cells, year, month };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// Render a single month section — header + day labels + day grid
function MonthSection({ monthDate, onSelectDay }) {
  const { cells, year, month } = buildCalendarDays(monthDate);
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Month label */}
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
        tháng {month + 1} {year}
      </div>

      {/* Day-of-week headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-secondary)",
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const photos = memoriesCalendar[key] || [];
          const hasPhotos = photos.length > 0;
          const isToday = key === TODAY_KEY;

          return (
            <button
              key={key}
              onClick={() => hasPhotos && onSelectDay(key)}
              disabled={!hasPhotos}
              style={{
                height: 44,
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                background: hasPhotos ? "transparent" : "var(--bg-elevated)",
                border: isToday
                  ? "2px solid var(--accent-yellow)"
                  : hasPhotos
                  ? "2px solid var(--accent-yellow)"
                  : "2px solid transparent",
                cursor: hasPhotos ? "pointer" : "default",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {hasPhotos ? (
                <>
                  <img
                    src={photos[0]}
                    alt={String(day)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {/* Count badge — only when day has 2+ moments */}
                  {photos.length > 1 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        background: "rgba(0,0,0,0.7)",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 8,
                        padding: "1px 5px",
                        lineHeight: 1.2,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {photos.length}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {day}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MemoriesScreen() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Auto-scroll to the bottom on mount so the current (newest) month is in view.
  // useLayoutEffect avoids the user seeing the initial top-anchored frame.
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Floating photos in the constellation header — first photo of first 3 dated entries
  const floatingPhotos = Object.values(memoriesCalendar)
    .map((arr) => arr[0])
    .slice(0, 3);
  const rotations = [-8, 4, -4];

  function selectDay(dateKey) {
    // Navigate to feed filtered by date
    navigate(`/feed?date=${dateKey}`);
  }

  // Stats bar lives with the current (last) month
  const lastIdx = memoriesMonths.length - 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — pushed down for safe-area breathing room (see docs/design-patterns.md §1.1) */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 16px",
          marginTop: 40,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>Kỷ niệm</span>
        <button
          onClick={() => setProfileOpen(true)}
          style={{
            position: "absolute",
            right: 16,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            borderRadius: "50%",
          }}
        >
          <Avatar src={currentUser.avatar} name={currentUser.name} size={32} />
        </button>
      </div>

      {/* Galaxy / constellation section */}
      <div
        style={{
          height: 200,
          position: "relative",
          background: "radial-gradient(ellipse at center, #1a0d2e 0%, #0c0c0c 80%)",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Star dots */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              left: `${(i * 37 + 10) % 100}%`,
              top: `${(i * 53 + 5) % 90}%`,
            }}
          />
        ))}

        {/* Floating photo thumbnails */}
        {floatingPhotos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              position: "absolute",
              width: 60,
              height: 60,
              borderRadius: 12,
              objectFit: "cover",
              transform: `rotate(${rotations[i]}deg)`,
              left: `${20 + i * 28}%`,
              top: `${20 + (i % 2) * 20}%`,
              border: "2px solid rgba(255,255,255,0.15)",
            }}
          />
        ))}

        {/* Connecting line to calendar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 1,
            height: 24,
            background: "rgba(255,255,255,0.15)",
          }}
        />
      </div>

      {/* Calendar section — vertically scrollable, multiple months stacked.
          Older months are above; current month at the bottom (auto-scrolled to on mount). */}
      <div
        ref={scrollRef}
        className="scroll-area"
        style={{
          flex: 1,
          background: "var(--bg-surface)",
          borderRadius: "20px 20px 0 0",
          padding: "16px 16px",
          paddingBottom: "calc(var(--nav-height) + 16px)",
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {memoriesMonths.map((monthDate, idx) => (
          <Fragment key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}>
            <MonthSection monthDate={monthDate} onSelectDay={selectDay} />
            {/* Stats bar anchored to the current (last) month */}
            {idx === lastIdx && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 12,
                  justifyContent: "center",
                }}
              >
                <div className="pill-btn" style={{ fontSize: 14 }}>
                  💛 {memoriesStats.lockets} Locket
                </div>
                <div className="pill-btn" style={{ fontSize: 14 }}>
                  🔥 {memoriesStats.streak}d chuỗi
                </div>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <BottomNav />

      {/* Profile sheet — opened from avatar (top-right) */}
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
