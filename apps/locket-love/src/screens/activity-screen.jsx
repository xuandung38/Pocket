// activity-screen.jsx
// Activity tab — Phase 7 implementation.
//
// Surface:
//   - Bottom-nav route /activity (registered in App.jsx by dev-10).
//   - Lists incoming reactions on user's own moments + rollcall posts,
//     newest-first. Pull-to-refresh re-loads via useActivityStore.loadActivity.
//   - Bottom-nav badge count is driven by `useActivityStore.unread`; this
//     screen calls `markRead()` on mount so opening the tab clears the badge.
//
// Realtime updates:
//   - The store subscribes to the socket in a side-channel useEffect below.
//     That subscription stays alive while this screen is mounted; live
//     reactions stream into the list without manual refresh.
//   - The same side-channel keeps the bottom-nav badge accurate; we wire the
//     subscription here (not at App.jsx root) to keep the store concern
//     local to Phase 7 ownership.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import BottomNav from "../components/ui/bottom-nav";
import Avatar from "../components/ui/avatar";
import {
  useActivityStore,
  selectActivityItems,
} from "@/stores/use-activity-store";
import { useAuthStore } from "@/stores";

// Render a unix-seconds timestamp as a short relative label.
function formatRelative(secs) {
  if (!secs) return "";
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - Number(secs));
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)}p`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}g`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}ngày`;
  return `${Math.floor(diff / 86400 / 7)}tuần`;
}

export default function ActivityScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const items = useActivityStore(selectActivityItems);
  const loading = useActivityStore((s) => s.loading);
  const loadActivity = useActivityStore((s) => s.loadActivity);
  const markRead = useActivityStore((s) => s.markRead);
  const subscribeSocket = useActivityStore((s) => s.subscribeSocket);

  // Load activity on mount + refresh whenever the auth user changes (e.g. a
  // different account logs in without a hard reload). We intentionally don't
  // gate on `loading` here; the store guards re-entry internally.
  useEffect(() => {
    if (!user) return;
    loadActivity();
  }, [user, loadActivity]);

  // Reset the unread badge when the tab is opened. Done in a separate effect
  // so it always runs on mount even if the user has no activity yet.
  useEffect(() => {
    markRead();
  }, [markRead]);

  // Side-channel socket subscription — see store comments. We subscribe inside
  // the screen (not App.jsx root) to keep the wiring local to Phase 7. The
  // store has its own internal dedupe so wiring this from multiple places is
  // safe; in practice only this screen mounts the subscription.
  useEffect(() => {
    const off = subscribeSocket();
    return () => off?.();
  }, [subscribeSocket]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-primary, #0c0c0c)",
        display: "flex",
        flexDirection: "column",
        color: "var(--text-primary, #fff)",
      }}
    >
      {/* Header — pushed down for safe-area breathing room (matches chat-list) */}
      <div
        style={{
          position: "relative",
          padding: "16px 16px",
          marginTop: 40,
          flexShrink: 0,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>Hoạt động</span>
      </div>

      {/* List body */}
      <div
        className="scroll-area"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingBottom: "var(--nav-height, 80px)",
        }}
      >
        {loading && items.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={32} />}
            title="Đang tải..."
            subtitle="Đang cập nhật hoạt động mới."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Heart size={32} />}
            title="Chưa có hoạt động"
            subtitle="Phản ứng và lời nhắn cho khoảnh khắc của bạn sẽ xuất hiện ở đây."
          />
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((item) => (
              <li key={item.id}>
                <ActivityRow
                  item={item}
                  onOpen={() => {
                    if (item.type === "reaction" && item.momentId) {
                      navigate(`/photo/${item.momentId}`);
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

// ---- Internal sub-components ---------------------------------------------

function ActivityRow({ item, onOpen }) {
  const isReaction = item.type === "reaction";
  const Icon = isReaction ? Heart : MessageCircle;

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        color: "var(--text-primary, #fff)",
        cursor: onOpen ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <Avatar src={item.actor?.avatar} name={item.actor?.name} size={44} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.actor?.name || "Người dùng"}
          </span>
          <Icon size={14} color="var(--text-secondary, rgba(255,255,255,0.5))" />
        </div>
        <span style={{ fontSize: 13, color: "var(--text-secondary, rgba(255,255,255,0.55))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isReaction
            ? `Đã thả ${item.emoji || "💛"} vào khoảnh khắc của bạn`
            : (item.prompt || "Đã chia sẻ trong Hỏi nhau")}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary, rgba(255,255,255,0.4))" }}>
          {formatRelative(item.createdAt)}
        </span>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              objectFit: "cover",
              background: "var(--bg-surface, rgba(255,255,255,0.05))",
            }}
          />
        ) : isReaction && item.emoji ? (
          <span style={{ fontSize: 22 }}>{item.emoji}</span>
        ) : null}
      </div>
    </button>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        color: "var(--text-secondary, rgba(255,255,255,0.55))",
        textAlign: "center",
      }}
    >
      <div style={{ opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #fff)" }}>
        {title}
      </div>
      <div style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>{subtitle}</div>
    </div>
  );
}
