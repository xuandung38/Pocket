import clsx from "clsx";
import { Flame } from "lucide-react";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Build 7-day mask ending today (Mon..Sun) from streak metadata.
// streak = { count: number, last_updated_yyyymmdd: number|string }
function buildDayMask(streak) {
  const days = Array(7).fill(false);
  if (!streak?.count || !streak?.last_updated_yyyymmdd) return days;

  const str = String(streak.last_updated_yyyymmdd);
  if (str.length !== 8) return days;

  const lastDate = new Date(
    Number(str.slice(0, 4)),
    Number(str.slice(4, 6)) - 1,
    Number(str.slice(6, 8)),
  );
  // Anchor row to ISO week (Mon..Sun) containing today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun..6=Sat
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + monOffset);

  const startStreak = new Date(lastDate);
  startStreak.setDate(lastDate.getDate() - (streak.count - 1));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (d > today) break;
    if (d >= startStreak && d <= lastDate) days[i] = true;
  }
  return days;
}

export default function StreakCalendar({ streak, className }) {
  const count = streak?.count ?? 0;
  const days = buildDayMask(streak);

  return (
    <div className={clsx("flex flex-col items-center gap-4", className)}>
      <div className="flex items-end gap-2">
        <Flame className="size-8 text-primary" strokeWidth={2.25} />
        <span className="text-5xl font-bold text-primary leading-none tabular-nums">
          {count}
        </span>
        <span className="text-sm text-base-content/60 mb-1">
          ngày streak
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 w-full max-w-xs">
        {days.map((active, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5"
            aria-label={`Day ${DAY_LABELS[i]} ${active ? "active" : "inactive"}`}
          >
            <div
              className={clsx(
                "w-8 h-8 rounded-full transition-colors",
                active
                  ? "bg-amber-400 shadow-[0_0_10px_-2px_rgba(251,191,36,0.6)]"
                  : "bg-base-200",
              )}
            />
            <span className="text-[11px] font-medium text-base-content/60">
              {DAY_LABELS[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
