import { useNavigate, useLocation } from "react-router-dom";
import { useActivityStore, selectActivityUnread } from "@/stores";

// 4-tab bottom nav (Camera | Feed | Messages | Activity).
// Profile is accessed via the avatar button in the camera top bar, not here.
// Tabs map to routes registered in App.jsx;
// active state derives from current pathname (with a small set of aliases so
// e.g. /chats AND /messages both highlight the Messages tab).
//
// Owned at the dev-10 nav-shell level. Phases that add tab-specific UX (Phase
// 7 activity, Phase 8 profile polish) should swap their icon/label here.

// Inline icons kept here to avoid a circular dep on screen-level libs.

function HomeIcon() {
  // Camera/home ring with center dot — looks identical for active/inactive,
  // tint is driven by parent button `color`.
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="5" fill="currentColor" />
    </svg>
  );
}

function GridIcon({ filled }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      {filled ? (
        <>
          <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" />
          <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" />
          <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" />
          <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

function ChatIcon({ filled }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      {filled ? (
        <path
          d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      {filled ? (
        <path
          d="M12 21s-7-4.5-9.5-9C.5 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M12 21s-7-4.5-9.5-9C.5 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// Tab list — single source of truth. `aliases` highlight the tab even when
// the active path differs (e.g. legacy /chats alongside new /messages).
const tabs = [
  { key: "camera", path: "/", aliases: [], label: "Camera", Icon: HomeIcon },
  { key: "feed", path: "/feed", aliases: ["/memories"], label: "Feed", Icon: GridIcon },
  { key: "messages", path: "/chats", aliases: ["/messages"], label: "Tin nhắn", Icon: ChatIcon },
  { key: "activity", path: "/activity", aliases: [], label: "Hoạt động", Icon: HeartIcon },
];

function isActiveTab(pathname, tab) {
  if (pathname === tab.path) return true;
  return tab.aliases.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
}

// Cap the badge label so a flood of unread notifications doesn't blow up
// the nav width. Anything above this renders as "N+".
const BADGE_CAP = 99;

function formatBadgeCount(n) {
  if (!n || n <= 0) return null;
  return n > BADGE_CAP ? `${BADGE_CAP}+` : String(n);
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Unread count driven by Phase 7 activity store. Opening the Activity tab
  // mounts ActivityScreen which calls `markRead()` and zeroes this out, so
  // the badge auto-clears on visit.
  const activityUnread = useActivityStore(selectActivityUnread);

  return (
    <nav
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--nav-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        background: "linear-gradient(to top, #0c0c0c 60%, transparent)",
        paddingBottom: "8px",
        zIndex: 30,
      }}
    >
      {tabs.map((tab) => {
        const active = isActiveTab(location.pathname, tab);
        const { Icon, key, path } = tab;
        const badgeLabel =
          tab.key === "activity" ? formatBadgeCount(activityUnread) : null;
        return (
          <button
            key={key}
            onClick={() => navigate(path)}
            aria-label={
              badgeLabel
                ? `${tab.label} (${activityUnread} chưa đọc)`
                : tab.label
            }
            aria-current={active ? "page" : undefined}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: active ? "#ffffff" : "rgba(255,255,255,0.4)",
              padding: "8px 14px",
              transition: "color 0.2s",
            }}
          >
            <Icon filled={active} />
            {active && <span className="tab-active-dot" />}
            {badgeLabel && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 4,
                  right: 6,
                  background: "var(--accent-color, #f5a623)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: "14px",
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  padding: "0 5px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  boxShadow: "0 0 0 2px #0c0c0c",
                }}
              >
                {badgeLabel}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
