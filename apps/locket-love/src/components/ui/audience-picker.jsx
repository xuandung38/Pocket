import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuthStore, useFriendStoreV2 } from "@/stores";
import Avatar from "./avatar";

// Match the BottomSheet exit timing so animations feel consistent.
// See docs/design-patterns.md §2.3 for the mount-then-exit pattern.
const EXIT_DURATION = 220;

// Dropdown audience picker — matches IMG_7931 top-center dropdown.
// "Bạn" = the current account owner's own feed (not a friend group).
// Reads `user` from auth store + `friends` from friend store so the dropdown
// always reflects the real graph (no more mock-data import).
export default function AudiencePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  // mounted/closing implement symmetric in/out animation
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const user = useAuthStore((s) => s.user);
  const friends = useFriendStoreV2((s) => s.friends);

  // Build option list reactively so newly accepted friends appear without remount.
  // Keys: backend uses `uid` (preferred), fall back to `id` for legacy shapes.
  const options = useMemo(() => {
    const ownerAvatar =
      user?.photoUrl || user?.photoURL || user?.avatar || null;
    const friendOpts = (friends ?? []).map((f) => ({
      id: f.uid ?? f.id,
      label: f.displayName || f.name || f.username || "Bạn bè",
      avatar: f.photoUrl || f.photoURL || f.avatar || null,
    }));
    return [
      { id: "all", label: "Mọi người", icon: null },
      { id: "owner", label: "Bạn", avatar: ownerAvatar },
      ...friendOpts,
    ];
  }, [user, friends]);

  const selected = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, EXIT_DURATION);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  function select(opt) {
    onChange(opt.id);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", zIndex: 50 }}>
      <button
        className="pill-btn"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 15 }}
      >
        <span
          style={{
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected.label}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={3}
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {mounted && (
        <>
          {/* backdrop — absolute (not fixed) so it stays inside .phone-frame */}
          <div
            className={closing ? "animate-fade-out" : "animate-fade-in"}
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              inset: "-100vh -100vw",
              zIndex: 40,
            }}
          />
          <div
            className={closing ? "animate-dropdown-out" : "animate-dropdown-in"}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: "50%",
              transformOrigin: "top center",
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: "6px 0",
              minWidth: 200,
              zIndex: 50,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              willChange: "transform, opacity",
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => select(opt)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: opt.id === value ? 600 : 400,
                  textAlign: "left",
                }}
              >
                {opt.avatar ? (
                  <Avatar src={opt.avatar} name={opt.label} size={28} />
                ) : (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--bg-elevated)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    {opt.id === "all" ? "👥" : "👤"}
                  </div>
                )}
                <span style={{ flex: 1 }}>{opt.label}</span>
                <ChevronDown
                  size={16}
                  strokeWidth={2.5}
                  style={{ transform: "rotate(-90deg)", opacity: 0.4 }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
