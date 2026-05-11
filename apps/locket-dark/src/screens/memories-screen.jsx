import { useState } from "react";
import Avatar from "../components/ui/avatar";
import BottomNav from "../components/ui/bottom-nav";
import { currentUser, memoriesCalendar, memoriesStats } from "../data/mock-data";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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

export default function MemoriesScreen() {
  const [currentMonth] = useState(new Date(2026, 4)); // May 2026
  const { cells, year, month } = buildCalendarDays(currentMonth);
  const today = 10; // fixed for demo

  const floatingPhotos = Object.values(memoriesCalendar).slice(0, 3);
  const rotations = [-8, 4, -4];

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
        <div style={{ position: "absolute", right: 16 }}>
          <Avatar src={currentUser.avatar} name={currentUser.name} size={32} />
        </div>
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

      {/* Calendar section */}
      <div
        className="scroll-area"
        style={{
          flex: 1,
          background: "var(--bg-surface)",
          borderRadius: "20px 20px 0 0",
          padding: "16px 16px",
          paddingBottom: "calc(var(--nav-height) + 16px)",
        }}
      >
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
            const photo = memoriesCalendar[key];
            const isToday = day === today;

            return (
              <div
                key={key}
                style={{
                  height: 44,
                  borderRadius: 12,
                  overflow: "hidden",
                  position: "relative",
                  background: photo ? "transparent" : "var(--bg-elevated)",
                  border: isToday
                    ? "2px solid var(--accent-yellow)"
                    : photo
                    ? "2px solid var(--accent-yellow)"
                    : "2px solid transparent",
                  cursor: photo ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={String(day)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{day}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "center" }}>
          <div className="pill-btn" style={{ fontSize: 14 }}>
            💛 {memoriesStats.lockets} Locket
          </div>
          <div className="pill-btn" style={{ fontSize: 14 }}>
            🔥 {memoriesStats.streak}d chuỗi
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
