import clsx from "clsx";

const SIZE = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
};

function getInitials(name) {
  if (!name) return "?";
  const trimmed = String(name).trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export default function FriendAvatar({
  src,
  name,
  unread = false,
  size = "md",
  className,
}) {
  const initials = getInitials(name);

  return (
    <div
      className={clsx(
        "relative shrink-0 rounded-full overflow-hidden bg-base-200 flex items-center justify-center font-semibold text-base-content/70",
        SIZE[size] ?? SIZE.md,
        unread && "ring-2 ring-amber-400 ring-offset-2 ring-offset-base-100",
        className,
      )}
      aria-label={name || "Friend avatar"}
    >
      {src ? (
        <img
          src={src}
          alt={name || ""}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
