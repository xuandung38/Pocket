import { Fragment, useLayoutEffect, useRef, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/ui/avatar";
import BottomNav from "../components/ui/bottom-nav";
import ProfileSheet from "../components/sheets/profile-sheet";
import { useMemoriesStore, selectMemoriesByDate, useAuthStore } from "@/stores";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function pad(n) {
  return String(n).padStart(2, "0");
}

// Today as a YYYY-MM-DD key (local) — matches the calendar cell keys.
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Resolve a moment's epoch (mirrors feed-screen / store) for newest-first sort.
function momentTs(m) {
  const numeric = Number(m?.createTime ?? m?.create_time);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const fromDate = Date.parse(m?.date ?? "");
  return Number.isFinite(fromDate) ? fromDate : 0;
}

// Build the list of months (Date @ day=1) spanning the earliest dated moment
// through the current month — older above, current month at the bottom.
function buildMonthsFromDates(dateKeys) {
  if (!dateKeys.length) return [];
  const earliest = dateKeys.reduce((min, d) => (d < min ? d : min));
  const [y, m] = earliest.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

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

// Render a single month section — header + day labels + day grid
function MonthSection({ monthDate, byDate, today, onSelectDay }) {
  const { cells, year, month } = buildCalendarDays(monthDate);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
        tháng {month + 1} {year}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const moments = byDate[key] || [];
          const photos = moments.map((m) => m.thumbnailUrl).filter(Boolean);
          const hasPhotos = photos.length > 0;
          const isToday = key === today;

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
                border:
                  isToday || hasPhotos ? "2px solid var(--accent-yellow)" : "2px solid transparent",
                cursor: hasPhotos ? "pointer" : "default",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {hasPhotos ? (
                <>
                  <img src={photos[0]} alt={String(day)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{day}</span>
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

  // Store (SWR): cache hydrates synchronously, then revalidates in background.
  const moments = useMemoriesStore((s) => s.moments);
  const streak = useMemoriesStore((s) => s.streak);
  const loading = useMemoriesStore((s) => s.loading);
  const hasMore = useMemoriesStore((s) => s.hasMore);
  const loadMemories = useMemoriesStore((s) => s.loadMemories);
  const loadMoreOlder = useMemoriesStore((s) => s.loadMoreOlder);
  const me = useAuthStore((s) => s.user);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const byDate = useMemo(() => selectMemoriesByDate({ moments }), [moments]);
  const dateKeys = useMemo(() => Object.keys(byDate), [byDate]);
  const months = useMemo(() => buildMonthsFromDates(dateKeys), [dateKeys]);
  const today = todayKey();
  const lockets = Object.keys(moments).length;
  const streakCount = streak?.count ?? 0;
  const isEmpty = months.length === 0 && !loading;

  // 3 newest moment thumbnails for the constellation header.
  const floatingPhotos = useMemo(
    () =>
      Object.values(moments)
        .sort((a, b) => momentTs(b) - momentTs(a))
        .map((m) => m.thumbnailUrl)
        .filter(Boolean)
        .slice(0, 3),
    [moments],
  );
  const rotations = [-8, 4, -4];

  // Scroll management. Keyed on `moments` (the data) so it also fires when an
  // older page merges into an already-existing month (no new month section, so
  // months.length is unchanged) — fixing a stale-anchor jump.
  const prevHeightRef = useRef(null);
  const didInitialScroll = useRef(false);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeightRef.current != null) {
      // Older page just landed — keep the viewport anchored (no jump).
      el.scrollTop += el.scrollHeight - prevHeightRef.current;
      prevHeightRef.current = null;
    } else if (!didInitialScroll.current && months.length > 0) {
      // First paint with data → jump to the newest (bottom) month, once only
      // (don't re-scroll on every silent revalidate).
      el.scrollTop = el.scrollHeight;
      didInitialScroll.current = true;
    }
  }, [moments, months.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if (prevHeightRef.current != null) return; // an older-page load is pending
    if (el.scrollTop < 80) {
      prevHeightRef.current = el.scrollHeight;
      loadMoreOlder();
    }
  }

  function selectDay(dateKey) {
    navigate(`/feed?date=${dateKey}`);
  }

  const lastIdx = months.length - 1;

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
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
          style={{ position: "absolute", right: 16, background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "50%" }}
        >
          <Avatar
            src={me?.profilePicture || me?.profile_picture_url || me?.avatar}
            name={me?.displayName || me?.first_name || me?.name || "Tôi"}
            size={32}
          />
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
        ref={scrollRef}
        onScroll={handleScroll}
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
        {isEmpty ? (
          <div
            data-testid="memories-empty"
            style={{ textAlign: "center", color: "var(--text-secondary)", padding: "48px 16px", fontSize: 15 }}
          >
            Chưa có kỷ niệm nào.
            <br />
            Chụp khoảnh khắc đầu tiên của bạn 💛
          </div>
        ) : (
          months.map((monthDate, idx) => (
            <Fragment key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}>
              <MonthSection monthDate={monthDate} byDate={byDate} today={today} onSelectDay={selectDay} />
              {idx === lastIdx && (
                <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center" }}>
                  <div className="pill-btn" style={{ fontSize: 14 }}>
                    💛 {lockets} Locket
                  </div>
                  <div className="pill-btn" style={{ fontSize: 14 }}>
                    🔥 {streakCount}d chuỗi
                  </div>
                </div>
              )}
            </Fragment>
          ))
        )}
      </div>

      <BottomNav />

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
