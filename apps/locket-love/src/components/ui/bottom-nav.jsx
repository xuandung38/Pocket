import { useNavigate, useLocation } from "react-router-dom";

// Grid icon — for memories/calendar tab
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

// Camera/Home icon — always an outlined ring with a center dot; active = white, inactive = dim
function HomeIcon({ filled }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="5" fill="currentColor" />
    </svg>
  );
}

// Chat icon
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

const tabs = [
  { path: "/memories", label: "Kỷ niệm", Icon: GridIcon },
  { path: "/", label: "Camera", Icon: HomeIcon },
  { path: "/chats", label: "Trò chuyện", Icon: ChatIcon },
];

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
      {tabs.map(({ path, Icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: active ? "#ffffff" : "rgba(255,255,255,0.4)",
              padding: "8px 20px",
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
