import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, MessageCircle } from "lucide-react";

// Locket-style bottom bar: a compact, centered floating pill — NOT a full-width
// bar. Three destinations:
//   Memory → /memories  (calendar of moments)
//   Shutter → /         (camera; prominent yellow-ring center)
//   Chat   → /chats     (/messages alias)
//
// The feed-only Grid + Share side buttons live in feed-screen.jsx (they need
// the active moment + a share sheet), not here. Notifications live behind the
// camera top-bar megaphone — intentionally absent from this bar.

// Center capture ring — mirrors CaptureButton so the bar reads like Locket's
// shutter. Active (on the camera route) tints the ring yellow.
function ShutterIcon({ active }) {
  return (
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: `3px solid ${
          active ? "var(--accent-yellow)" : "rgba(255,255,255,0.85)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <span
        style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }}
      />
    </span>
  );
}

const tabs = [
  { key: "memory", path: "/memories", aliases: [], label: "Kỷ niệm", Icon: CalendarDays },
  { key: "camera", path: "/", aliases: [], label: "Máy ảnh", shutter: true },
  { key: "messages", path: "/chats", aliases: ["/messages"], label: "Tin nhắn", Icon: MessageCircle },
];

function isActiveTab(pathname, tab) {
  if (pathname === tab.path) return true;
  return tab.aliases.some(
    (alias) => pathname === alias || pathname.startsWith(`${alias}/`),
  );
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      style={{
        position: "absolute",
        bottom: 22,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: 5,
          borderRadius: 999,
          background: "rgba(30,30,32,0.78)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
          pointerEvents: "auto",
        }}
      >
        {tabs.map((tab) => {
          const active = isActiveTab(location.pathname, tab);
          const { Icon, key, path, label, shutter } = tab;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                background:
                  active && !shutter ? "rgba(255,255,255,0.16)" : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.6)",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {shutter ? (
                <ShutterIcon active={active} />
              ) : (
                <Icon size={23} strokeWidth={active ? 2.4 : 2} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
