import clsx from "clsx";
import { formatTimeAgo } from "@/utils/Formats/formatTimeAgo";

// Inline minimal avatar — used as fallback if FriendAvatar (dev-4) is unavailable.
function InlineAvatar({ friend, size = 44 }) {
  const src = friend?.profile_picture_url;
  const initials =
    `${friend?.first_name?.[0] ?? ""}${friend?.last_name?.[0] ?? ""}`.toUpperCase() ||
    "?";
  return (
    <div
      className="rounded-full bg-base-200 text-primary font-semibold flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-primary/20"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="text-sm">{initials}</span>
      )}
    </div>
  );
}

export default function FriendListItem({
  friend,
  rollcallPending = false,
  onClick,
  className,
}) {
  if (!friend) return null;

  const name =
    [friend.first_name, friend.last_name].filter(Boolean).join(" ") ||
    friend.username ||
    "Bạn bè";
  const lastMomentTs =
    friend.last_moment_at ||
    friend.last_moment_date ||
    friend.last_active_at ||
    null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl",
        "hover:bg-base-200/70 active:scale-[0.99] transition text-left",
        className,
      )}
    >
      <InlineAvatar friend={friend} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-base-content truncate">
          {name}
        </p>
        {lastMomentTs ? (
          <p className="text-xs text-base-content/60 truncate">
            {formatTimeAgo(lastMomentTs)}
          </p>
        ) : (
          <p className="text-xs text-base-content/40 truncate">Chưa có hoạt động</p>
        )}
      </div>
      {rollcallPending && (
        <span
          className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0"
          aria-label="Rollcall pending"
        />
      )}
    </button>
  );
}
