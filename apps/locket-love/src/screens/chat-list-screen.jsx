// chat-list-screen.jsx
// Conversations tab — Phase 6 wiring.
//
// Data model:
//   - Conversation = friend (uid) + lastMessage metadata (delivered via socket
//     `new_on_list_message`). The backend uses friend uid as conversation id.
//   - Friend list is the source of truth for who the user can chat with —
//     comes from useFriendStoreV2 (Phase 3).
//   - Last-message info arrives via socket: on mount we subscribe + emit
//     `get_list_message`; updates land in local state keyed by friend uid.
//
// Lifecycle:
//   1. Mount → connectSocket(idToken) (idempotent — reuses singleton).
//   2. Load friends if not already loaded.
//   3. Subscribe to onListMessage → seed convMeta map.
//   4. emitGetListMessage() to request initial snapshot.
//   5. Unmount → unsubscribe (socket itself persists across screens).

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Avatar from "../components/ui/avatar";
import BottomNav from "../components/ui/bottom-nav";
import {
  useAuthStore,
  useFriendStoreV2,
  useChatStore,
  selectConvMeta,
} from "@/stores";
import { getToken } from "@/utils";
import { emitGetListMessage } from "@/services/socket-service";

// Format a unix-seconds timestamp into a short relative label (e.g. "10p",
// "5g", "2ngày"). Returns "" for falsy input.
function formatRelative(secs) {
  if (!secs) return "";
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - Number(secs));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}p`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}g`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}ngày`;
  return `${Math.floor(diff / 86400 / 7)}tuần`;
}

export default function ChatListScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const friends = useFriendStoreV2((s) => s.friends);
  const loading = useFriendStoreV2((s) => s.loading);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);

  // Conversation metadata (last message / unread) lives in the chat store and
  // is kept fresh by the store-owned socket listeners — so the list no longer
  // resets to empty when re-entering this tab.
  const convMeta = useChatStore(selectConvMeta);
  const initSocket = useChatStore((s) => s.initSocket);

  // Bootstrap friends list if empty (e.g. cold-load directly into /messages).
  useEffect(() => {
    if (!friends?.length) loadFriends();
  }, [friends?.length, loadFriends]);

  // Open the socket (store attaches listeners once) + request the list snapshot.
  useEffect(() => {
    const { idToken } = getToken();
    if (!idToken) return undefined;
    initSocket(idToken);
    emitGetListMessage();
    return undefined;
  }, [initSocket]);

  // Sorted display list — friends with chat metadata first (by recency),
  // then friends without any chat history at the bottom (alpha by name).
  const sorted = useMemo(() => {
    const enriched = (friends || []).map((f) => {
      const meta = convMeta[f.uid] || {};
      const name =
        [f.firstName, f.lastName].filter(Boolean).join(" ") ||
        f.username ||
        "Friend";
      return {
        id: f.uid,
        uid: f.uid,
        friend: { name, avatar: f.profilePic },
        lastMessage: meta.lastMessage || "",
        lastTimeNum: meta.lastTime || 0,
        lastTime: formatRelative(meta.lastTime),
        unread: meta.unread || 0,
      };
    });
    return enriched.sort((a, b) => {
      if (a.lastTimeNum !== b.lastTimeNum) {
        return (b.lastTimeNum || 0) - (a.lastTimeNum || 0);
      }
      return a.friend.name.localeCompare(b.friend.name);
    });
  }, [friends, convMeta]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, #1a1a1a, #0c0c0c)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — pushed down for safe-area breathing room (see docs/design-patterns.md §1.1) */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 16px",
          marginTop: 40,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>Trò chuyện</span>
        <div style={{ position: "absolute", right: 16 }}>
          <Avatar
            src={user?.profile_picture_url || user?.profilePic}
            name={user?.first_name || user?.displayName || "U"}
            size={32}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div
        className="scroll-area"
        style={{ flex: 1, paddingBottom: "var(--nav-height)" }}
      >
        {loading && sorted.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 14,
            }}
          >
            Đang tải bạn bè...
          </div>
        ) : sorted.length === 0 ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 14,
            }}
          >
            Chưa có cuộc trò chuyện nào.
            <br />
            Hãy kết bạn để bắt đầu nhắn tin.
          </div>
        ) : (
          sorted.map((conv, idx) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/chats/${conv.id}`)}
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
                borderBottom:
                  idx < sorted.length - 1
                    ? "1px solid var(--border-subtle)"
                    : "none",
                textAlign: "left",
              }}
            >
              <Avatar src={conv.friend.avatar} name={conv.friend.name} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                  {conv.friend.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conv.lastMessage || "Bắt đầu trò chuyện"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {conv.lastTime}
                </span>
                {conv.unread > 0 ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      background: "var(--accent-color, #f5a623)",
                      borderRadius: 9999,
                      padding: "0 6px",
                      minWidth: 18,
                      height: 18,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {conv.unread}
                  </span>
                ) : (
                  <ChevronRight size={16} color="var(--text-tertiary)" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
