import { useState, useMemo } from "react";
import { Search, X, ChevronRight, UserPlus } from "lucide-react";
import BottomSheet from "./bottom-sheet";
import Avatar from "../ui/avatar";
import { friends, searchableUsers, FRIENDS_LIMIT } from "../../data/mock-data";

// Friend invite/manage sheet — opens when tapping the "X người bạn" pill on camera screen.
// Empty search → shows current friends + share options.
// Non-empty search → shows matching searchable users with "+ Thêm" buttons.

const APP_LINKS = [
  { id: "messenger", label: "Messenger", icon: "💬", color: "#0078ff" },
  { id: "insta", label: "Insta", icon: "📷", color: "#e4405f" },
  { id: "imessage", label: "Tin nhắn", icon: "💚", color: "#34c759" },
  { id: "other", label: "Khác", icon: "🔗", color: "#3a3a3c" },
];

const SHARE_TARGETS = [
  { id: "messenger", label: "Messenger", icon: "💬", color: "#0078ff" },
  { id: "insta-msg", label: "Tin nhắn Instagram", icon: "💌", color: "#e4405f" },
  { id: "insta", label: "Tin Instagram", icon: "📷", color: "#e4405f" },
  { id: "imessage", label: "Tin nhắn", icon: "💚", color: "#34c759" },
];

export default function FriendsSheet({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [addedIds, setAddedIds] = useState([]);

  // When sheet closes, reset transient state
  function handleClose() {
    onClose();
    setTimeout(() => {
      setQuery("");
      setAddedIds([]);
    }, 350);
  }

  const trimmed = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmed) return [];
    return searchableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(trimmed) ||
        u.username.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div style={{ padding: "0 16px 24px", maxHeight: "82vh", overflowY: "auto", scrollbarWidth: "none" }}>
        {/* Header — count + subtitle */}
        <div style={{ textAlign: "center", padding: "8px 0 14px" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {friends.length} / {FRIENDS_LIMIT} người bạn
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            Mời một người bạn để tiếp tục
          </div>
        </div>

        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-elevated)",
            borderRadius: 14,
            padding: "10px 14px",
            marginBottom: 18,
          }}
        >
          <Search size={18} color="var(--text-secondary)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Thêm một người bạn mới"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 15,
              fontWeight: 500,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 14,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Hủy
            </button>
          )}
        </div>

        {trimmed ? (
          <SearchResults results={searchResults} addedIds={addedIds} onAdd={(id) => setAddedIds((p) => [...p, id])} />
        ) : (
          <DefaultContent />
        )}

        {/* Share-link section — always visible */}
        <SectionLabel icon={<ShareIcon />} text="Chia sẻ liên kết Locket của bạn" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {SHARE_TARGETS.map((t) => (
            <button
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 4px",
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <AppIcon icon={t.icon} color={t.color} size={36} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{t.label}</span>
              <ChevronRight size={18} color="var(--text-secondary)" />
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

function SearchResults({ results, addedIds, onAdd }) {
  return (
    <>
      <SectionLabel icon={<UserPlus size={18} color="var(--text-secondary)" />} text="Thêm theo tên người dùng" />
      {results.length === 0 ? (
        <div style={{ padding: "16px 0 24px", textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
          Không tìm thấy người dùng
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
          {results.map((u) => {
            const added = addedIds.includes(u.id);
            return (
              <div
                key={u.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}
              >
                <Avatar src={u.avatar} name={u.name} size={44} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{u.name}</span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{u.username}</span>
                </div>
                <button
                  onClick={() => !added && onAdd(u.id)}
                  disabled={added}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: added ? "var(--bg-elevated)" : "var(--accent-yellow)",
                    color: added ? "var(--text-secondary)" : "#000",
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: added ? "default" : "pointer",
                  }}
                >
                  {added ? "Đã gửi" : "+ Thêm"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function DefaultContent() {
  return (
    <>
      <SectionLabel icon={<span style={{ fontSize: 18 }}>👥</span>} text="Find friends from other apps" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          padding: "12px",
          background: "var(--bg-elevated)",
          borderRadius: 16,
          marginBottom: 22,
        }}
      >
        {APP_LINKS.map((a) => (
          <div
            key={a.id}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
          >
            <AppIcon icon={a.icon} color={a.color} size={48} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{a.label}</span>
          </div>
        ))}
      </div>

      <SectionLabel icon={<span style={{ fontSize: 16 }}>👫</span>} text="Bạn bè của bạn" />
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
        {friends.map((f) => (
          <div
            key={f.id}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}
          >
            <div style={{ borderRadius: "50%", padding: 2, border: "2px solid var(--accent-yellow)" }}>
              <Avatar src={f.avatar} name={f.name} size={40} />
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{f.name}</span>
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 6,
              }}
            >
              <X size={20} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function SectionLabel({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{text}</span>
    </div>
  );
}

function AppIcon({ icon, color, size }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
      }}
    >
      {icon}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" color="var(--text-secondary)">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
