import { useNavigate, useLocation } from "react-router-dom";

// 5-tab shell nav (Camera | Feed | Profile | Messages | Activity) — replaces the
// legacy 3-tab Locket-dark layout. Tabs map to routes registered in App.jsx;
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

function UserIcon({ filled }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      {filled ? (
        <path
          d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z"
          fill="currentColor"
        />
      ) : (
        <>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M4 21v-1c0-3.31 3.58-6 8-6s8 2.69 8 6v1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
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
  { key: "profile", path: "/profile", aliases: [], label: "Hồ sơ", Icon: UserIcon },
  { key: "messages", path: "/chats", aliases: ["/messages"], label: "Tin nhắn", Icon: ChatIcon },
  { key: "activity", path: "/activity", aliases: [], label: "Hoạt động", Icon: HeartIcon },
];

function isActiveTab(pathname, tab) {
  if (pathname === tab.path) return true;
  return tab.aliases.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

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
        return (
          <button
            key={key}
            onClick={() => navigate(path)}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            style={{
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
          </button>
        );
      })}
    </nav>
  );
}
