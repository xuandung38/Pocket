import clsx from "clsx";
import { Camera, MessageCircle, Sparkles, User } from "lucide-react";

const TABS = [
  { key: "camera", Icon: Camera, label: "Capture" },
  { key: "feed", Icon: Sparkles, label: "Feed" },
  { key: "messages", Icon: MessageCircle, label: "Chats" },
  { key: "profile", Icon: User, label: "You" },
];

export default function BottomTabBar({ active, onChange }) {
  return (
    <nav
      role="tablist"
      aria-label="Primary"
      className={clsx(
        "fixed bottom-0 inset-x-0 z-40",
        "pb-[env(safe-area-inset-bottom)]",
        "bg-base-100/90 backdrop-blur-md",
        "border-t border-base-200",
      )}
    >
      <ul className="flex justify-around items-center h-16 px-2">
        {TABS.map(({ key, Icon, label }) => {
          const isActive = key === active;
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                onClick={() => onChange(key)}
                className={clsx(
                  "w-full h-full flex flex-col items-center justify-center gap-0.5",
                  "transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded-2xl",
                )}
              >
                <span
                  className={clsx(
                    "flex items-center justify-center rounded-full transition-all",
                    isActive
                      ? "bg-primary text-primary-content size-10 shadow-[0_4px_12px_-4px_rgba(249,115,22,0.55)]"
                      : "size-10 text-base-content/40",
                  )}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={isActive ? 2.25 : 1.75}
                  />
                </span>
                <span
                  className={clsx(
                    "text-[10px] font-medium leading-none",
                    isActive ? "text-primary" : "text-base-content/50",
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
