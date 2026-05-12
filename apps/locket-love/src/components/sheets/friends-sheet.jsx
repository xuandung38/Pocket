import { useEffect, useMemo, useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import BottomSheet from "./bottom-sheet";
import Avatar from "../ui/avatar";
import {
  FindFriend,
  IncomingRequests,
  OutgoingRequest,
} from "@/components/friends";
import { useAuthStore, useFriendStoreV2 } from "@/stores";
import { FRIENDS_LIMIT } from "../../data/mock-data";

// Friend invite/manage sheet — opens when tapping the "X người bạn" pill on camera screen.
// Composition (top → bottom):
//   1. FindFriend       — username/phone search + send request (dev-9, Phase 7)
//   2. IncomingRequests — accept/deny pending invites           (dev-9, Phase 7)
//   3. OutgoingRequest  — withdraw outgoing invites             (dev-9, Phase 7)
//   4. Local friend filter + friend list (existing)
//   5. Share-link section (static deep-links)
//
// The previous inline "search" input is kept as a local filter over the friend
// list only — the FindFriend component above handles the cross-account search
// against the backend. Sections render unconditionally so empty states from
// dev-9's components stay visible (their own empty-state copy is friendlier).

const SHARE_TARGETS = [
  { id: "messenger", label: "Messenger", icon: "💬", color: "#0078ff" },
  { id: "insta-msg", label: "Tin nhắn Instagram", icon: "💌", color: "#e4405f" },
  { id: "insta", label: "Tin Instagram", icon: "📷", color: "#e4405f" },
  { id: "imessage", label: "Tin nhắn", icon: "💚", color: "#34c759" },
];

// Normalize a friend record (or pending-request entry) into the shape this
// sheet renders. Tolerates both the V2 normalized shape (`firstName`, `profilePic`)
// and legacy mock shape (`name`, `avatar`).
function presentFriend(f, fallbackName) {
  const composed = [f?.firstName, f?.lastName].filter(Boolean).join(" ").trim();
  return {
    uid: f?.uid || f?.id || "",
    name: composed || f?.name || f?.username || fallbackName || "Người dùng",
    username: f?.username || "",
    avatar: f?.profilePic || f?.avatar || null,
  };
}

export default function FriendsSheet({ open, onClose }) {
  const [query, setQuery] = useState("");

  const friends = useFriendStoreV2((s) => s.friends);
  const pendingIn = useFriendStoreV2((s) => s.pendingIn);
  const friendsLoading = useFriendStoreV2((s) => s.loading);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const removeFriendLocal = useFriendStoreV2((s) => s.removeFriendLocal);

  const user = useAuthStore((s) => s.user);

  // Load the friend graph the first time the sheet opens. Subsequent opens
  // re-use the cached store state — no thrash.
  useEffect(() => {
    if (!open) return;
    if (!friends?.length && !friendsLoading) loadFriends?.();
  }, [open, friends?.length, friendsLoading, loadFriends]);

  // Reset transient state after the sheet finishes its close animation. The
  // 350ms delay matches the BottomSheet exit timing — touching state earlier
  // causes a flash of an empty list during the slide-out.
  function handleClose() {
    onClose();
    setTimeout(() => setQuery(""), 350);
  }

  const trimmed = query.trim().toLowerCase();
  const filteredFriends = useMemo(() => {
    if (!friends?.length) return [];
    if (!trimmed) return friends;
    return friends.filter((f) => {
      const name = [f.firstName, f.lastName].filter(Boolean).join(" ").trim().toLowerCase();
      const uname = (f.username || "").toLowerCase();
      return name.includes(trimmed) || uname.includes(trimmed);
    });
  }, [friends, trimmed]);

  const friendCount = friends?.length || 0;

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div style={{ padding: "0 16px 24px", maxHeight: "82vh", overflowY: "auto", scrollbarWidth: "none" }}>
        {/* Header — count + subtitle */}
        <div style={{ textAlign: "center", padding: "8px 0 14px" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {friendCount} / {FRIENDS_LIMIT} người bạn
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            {pendingIn?.length > 0
              ? `${pendingIn.length} lời mời đang chờ`
              : "Mời một người bạn để tiếp tục"}
          </div>
        </div>

        {/* 1) Cross-account user search + send-request CTA (dev-9 Phase 7). */}
        <div style={{ marginBottom: 18 }}>
          <FindFriend />
        </div>

        {/* 2) Incoming requests — accept/deny */}
        <div style={{ marginBottom: 18 }}>
          <IncomingRequests />
        </div>

        {/* 3) Outgoing requests — cancel */}
        <div style={{ marginBottom: 18 }}>
          <OutgoingRequest />
        </div>

        {/* Local filter — narrows the friend list rendered below. Separate
            from the FindFriend cross-account search above. */}
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
            placeholder="Lọc bạn theo tên hoặc @username"
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

        {/* 4) Friend list — real data from store. Loading shimmer on cold load. */}
        <FriendsSection
          friends={filteredFriends}
          loading={friendsLoading}
          hasSearch={Boolean(trimmed)}
          onRemove={removeFriendLocal}
        />

        {/* Share-link section — always visible (deep-links, no API) */}
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

        {/* User's own share slug — falls back to "user" if BE didn't provide one */}
        {user?.username && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            locket.cam/{String(user.username).replace(/^@+/, "")}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// ---------- Section components -----------------------------------------
// Incoming + outgoing request sections now live in @/components/friends
// (dev-9 Phase 7). FriendsSection is kept here since it's a thin local
// renderer over the V2 store list, not a reusable feature module.

function FriendsSection({ friends, loading, hasSearch, onRemove }) {
  if (loading && friends.length === 0) {
    return (
      <>
        <SectionLabel icon={<span style={{ fontSize: 16 }}>👫</span>} text="Bạn bè của bạn" />
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          Đang tải danh sách bạn bè...
        </div>
      </>
    );
  }

  if (friends.length === 0) {
    return (
      <>
        <SectionLabel icon={<span style={{ fontSize: 16 }}>👫</span>} text="Bạn bè của bạn" />
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          {hasSearch ? "Không tìm thấy bạn nào khớp." : "Chưa có bạn bè."}
        </div>
      </>
    );
  }

  return (
    <>
      <SectionLabel icon={<span style={{ fontSize: 16 }}>👫</span>} text="Bạn bè của bạn" />
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
        {friends.map((f) => {
          const p = presentFriend(f);
          return (
            <div
              key={p.uid || `friend-${p.name}`}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}
            >
              <div style={{ borderRadius: "50%", padding: 2, border: "2px solid var(--accent-yellow)" }}>
                <Avatar src={p.avatar} name={p.name} size={40} />
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{p.name}</span>
              <button
                onClick={() => onRemove?.(p.uid)}
                aria-label={`Xoá ${p.name}`}
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
          );
        })}
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
