import clsx from "clsx";
import { User } from "lucide-react";
import { formatTimeAgo } from "@/utils";

function Avatar({ url, name, isUnread }) {
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")
    : "";

  return (
    <div className="relative shrink-0">
      <div
        className={clsx(
          "size-14 rounded-full overflow-hidden bg-base-200 flex items-center justify-center text-base-content/60 font-semibold",
          isUnread ? "ring-2 ring-primary" : "ring-1 ring-base-200",
        )}
      >
        {url ? (
          <img
            src={url}
            alt={name || "user"}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : initials ? (
          <span className="text-sm">{initials}</span>
        ) : (
          <User className="size-6" strokeWidth={1.75} />
        )}
      </div>
    </div>
  );
}

export default function ConversationItem({
  conversation,
  friend,
  unreadCount = 0,
  onClick,
  className,
}) {
  const isUnread = unreadCount > 0 || conversation?.isRead === false;
  const fullName = friend
    ? [friend.firstName, friend.lastName].filter(Boolean).join(" ").trim()
    : "Unknown";
  const previewText = conversation?.latestMessage?.body || "";
  const timestamp = Number(conversation?.latestMessage?.createdAt) || 0;
  const timeMs =
    timestamp && String(timestamp).length === 10 ? timestamp * 1000 : timestamp;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl",
        "bg-base-100 hover:bg-base-200/60 active:bg-base-200 transition-colors",
        "text-left",
        className,
      )}
    >
      <Avatar url={friend?.profilePic} name={fullName} isUnread={isUnread} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={clsx(
              "truncate text-base",
              isUnread
                ? "font-semibold text-base-content"
                : "font-medium text-base-content/90",
            )}
          >
            {fullName || "Unknown"}
          </p>
          {timeMs > 0 && (
            <span className="text-xs text-base-content/50 shrink-0">
              {formatTimeAgo(timeMs)}
            </span>
          )}
        </div>
        <p
          className={clsx(
            "truncate text-sm pt-0.5",
            isUnread ? "text-base-content/80" : "text-base-content/55",
          )}
        >
          {previewText || "Bắt đầu trò chuyện"}
        </p>
      </div>

      {isUnread && (
        <span
          className="ml-2 shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-content text-[11px] font-bold"
          aria-label={`${unreadCount || 1} unread`}
        >
          {unreadCount > 0 ? unreadCount : ""}
        </span>
      )}
    </button>
  );
}
