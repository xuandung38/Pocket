// chat-detail-screen.jsx
// One-on-one chat — Phase 6 wiring.
//
// Data flow:
//   - Friend uid is the conversation id (URL param :id).
//   - On mount: connectSocket → emit `get_messages_with_user` to receive
//     history + subscribe to live pushes.
//   - Outgoing: optimistic append to local list → call sendMessage → socket
//     echo de-duplicates by message id.
//   - Read-receipt: `markReadMessage` fires on mount (best-effort).
//
// Message shape from backend (see chat-namespace-handler.normalizeWsMessage):
//   { id, uid, body, sender, type, createdAt, update_time, replyMoment,
//     thumbnailUrl, isRead }
//
// ChatBubble expects: { text, image, time, caption, rating, senderId }
// We adapt at render time, no separate normalization layer.

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MoreHorizontal, Send, Loader2 } from "lucide-react";
import Avatar from "../components/ui/avatar";
import ChatBubble from "../components/ui/chat-bubble";
import { useFriendStoreV2, useChatStore, selectMessages } from "@/stores";
import { getToken } from "@/utils";
import { sendMessage, markReadMessage } from "@/services";
import { emitTyping } from "@/services/socket-service";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

// Format unix-seconds → "HH:MM dd/mm" for message group headers.
function formatMessageTime(secs) {
  if (!secs) return "";
  const d = new Date(Number(secs) * 1000);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? hhmm : `${hhmm} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

// Debounce factory — used for typing emit so we don't spam the socket.
function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export default function ChatDetailScreen() {
  const { id: friendUid } = useParams();
  const navigate = useNavigate();
  // myUid comes from the chat store (set on initSocket from getToken().localId)
  // so optimistic stubs, peer detection, and isOwn rendering all agree.
  const myUid = useChatStore((s) => s.myUid) || getToken().localId || "me";

  // Store-owned actions (stable refs).
  const initSocket = useChatStore((s) => s.initSocket);
  const openConversation = useChatStore((s) => s.openConversation);
  const setUnreadZero = useChatStore((s) => s.setUnreadZero);
  const addOptimistic = useChatStore((s) => s.addOptimistic);
  const reconcileOptimistic = useChatStore((s) => s.reconcileOptimistic);

  // Friend lookup (read-only — friends array is hydrated by chat-list /
  // bootstrap; if direct-navigated, we still render with a placeholder).
  const friend = useFriendStoreV2((s) =>
    (s.friends || []).find((f) => f.uid === friendUid),
  );
  const friendName = useMemo(() => {
    if (!friend) return "...";
    return (
      [friend.firstName, friend.lastName].filter(Boolean).join(" ") ||
      friend.username ||
      "Friend"
    );
  }, [friend]);

  // Message list comes from the store (survives navigation → no blank flash).
  const messages = useChatStore(selectMessages(friendUid));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef(null);
  const listEndRef = useRef(null);

  // --- Subscribe to this conversation -------------------------------------
  // The store owns the socket listeners; here we just open the conversation
  // (live WS + history fetch) WITHOUT clearing the cached list — that's what
  // removes the blank-flash + full-reload on every open. Read-receipt is
  // best-effort. No cleanup: the store keeps accumulating across navigations.
  useEffect(() => {
    if (!friendUid) return undefined;
    const { idToken } = getToken();
    if (!idToken) return undefined;
    initSocket(idToken);
    openConversation(friendUid);
    markReadMessage(friendUid);
    setUnreadZero(friendUid);
    return undefined;
  }, [friendUid, initSocket, openConversation, setUnreadZero]);

  // Scroll-to-bottom when new messages arrive. Newest sits at the bottom of
  // the visible column (rendered in reverse below).
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // --- Outgoing send -------------------------------------------------------
  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !friendUid) return;

    // Optimistic stub lives in the store; the real backend echo replaces it
    // (matched by sender+body) via mergeOne — no duplicate.
    const tmpId = addOptimistic(friendUid, { body: text });
    setDraft("");
    setSending(true);

    try {
      await sendMessage({ receiver_uid: friendUid, message: text });
      reconcileOptimistic(friendUid, tmpId, { ok: true });
    } catch (err) {
      console.error("[chat-detail] send failed:", err?.message);
      // Rollback the stub + restore draft so the user can retry.
      reconcileOptimistic(friendUid, tmpId, { ok: false });
      setDraft(text);
    } finally {
      setSending(false);
    }
  }, [draft, sending, friendUid, addOptimistic, reconcileOptimistic]);

  // Debounced typing emit (no-op against current backend — see socket-service).
  const emitTypingDebounced = useMemo(
    () => debounce(() => emitTyping(friendUid), 400),
    [friendUid],
  );

  const handleDraftChange = useCallback(
    (e) => {
      setDraft(e.target.value);
      emitTypingDebounced();
    },
    [emitTypingDebounced],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // --- Pull-to-refresh -----------------------------------------------------
  // Pull down at the top to re-sync this conversation. Re-emitting fetches the
  // latest from the backend; the store merges (dedupe-by-id) so only genuinely
  // new messages append. Socket delivery is fire-and-forget, so we show the
  // spinner briefly rather than awaiting a (non-existent) promise.
  const handleRefresh = useCallback(() => {
    if (refreshing || !friendUid) return;
    setRefreshing(true);
    openConversation(friendUid);
    setTimeout(() => setRefreshing(false), 900);
  }, [refreshing, friendUid, openConversation]);

  const { pull, threshold, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: !refreshing,
  });

  // --- More-options menu --------------------------------------------------
  useEffect(() => {
    if (!showMenu) return undefined;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  // --- Render -------------------------------------------------------------
  // Reverse the (newest-first) list for visual top-to-bottom oldest-first.
  const displayed = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "var(--bg-primary)",
          padding: "12px 16px",
          paddingTop: 52,
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 20,
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <button
          className="icon-btn"
          onClick={() => navigate(-1)}
          style={{ background: "none", backdropFilter: "none" }}
        >
          <ChevronLeft size={24} />
        </button>
        <Avatar src={friend?.profilePic} name={friendName} size={32} />
        <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>
          {friendName}
        </span>
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            className="icon-btn"
            onClick={() => setShowMenu((v) => !v)}
            style={{ background: "none", backdropFilter: "none" }}
          >
            <MoreHorizontal size={22} />
          </button>

          {showMenu && (
            <div
              className="animate-fade-in"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "var(--bg-elevated)",
                borderRadius: 16,
                overflow: "hidden",
                zIndex: 50,
                minWidth: 160,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {[
                { label: "Xóa bạn", color: "var(--text-primary)" },
                { label: "Báo cáo", color: "var(--text-primary)" },
                { label: "Chặn", color: "#ef4444" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setShowMenu(false)}
                  style={{
                    width: "100%",
                    height: 44,
                    padding: "0 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: item.color,
                    fontSize: 15,
                    textAlign: "left",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message list (oldest at top, newest at bottom) */}
      <div
        className="scroll-area"
        {...pullHandlers}
        style={{
          flex: 1,
          padding: "8px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          paddingBottom: 80,
        }}
      >
        {/* Pull-to-refresh indicator (top). Visible while dragging or syncing. */}
        {(pull > 0 || refreshing) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: refreshing ? 36 : pull,
              overflow: "hidden",
              flexShrink: 0,
              color: "var(--text-tertiary)",
              transition: refreshing ? "height 0.2s ease" : "none",
            }}
          >
            <Loader2
              size={20}
              className="animate-spin"
              style={{
                opacity: refreshing ? 1 : Math.min(pull / threshold, 1),
                animationPlayState: refreshing ? "running" : "paused",
              }}
            />
          </div>
        )}
        {displayed.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-tertiary)",
              fontSize: 14,
            }}
          >
            Chưa có tin nhắn. Hãy gửi tin đầu tiên!
          </div>
        ) : (
          displayed.map((msg, idx) => {
            const prev = displayed[idx - 1];
            const isOwn = msg.sender === myUid;
            // Show timestamp header when crossing a 10-minute gap or on first.
            const gapSecs =
              Number(msg.createdAt || msg.update_time || 0) -
              Number(prev?.createdAt || prev?.update_time || 0);
            const showTime = !prev || Math.abs(gapSecs) > 600;
            const showAvatar =
              !isOwn && (!prev || prev.sender !== msg.sender || showTime);
            return (
              <ChatBubble
                key={msg.id}
                msg={{
                  text: msg.body || msg.text || "",
                  image: msg.thumbnailUrl || null,
                  time: showTime
                    ? formatMessageTime(msg.createdAt || msg.update_time)
                    : null,
                  caption: msg.caption || null,
                  rating: msg.rating || null,
                  senderId: isOwn ? "me" : msg.sender,
                  _pending: msg._pending,
                }}
                isOwn={isOwn}
                showAvatar={showAvatar}
                friend={{ name: friendName, avatar: friend?.profilePic }}
              />
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--bg-primary)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          onKeyDown={handleKeyDown}
          placeholder="Gửi tin nhắn..."
          disabled={sending}
          style={{
            flex: 1,
            background: "var(--bg-surface)",
            border: "none",
            outline: "none",
            borderRadius: 9999,
            padding: "10px 16px",
            fontSize: 15,
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="icon-btn"
          style={{
            background: "none",
            opacity: !draft.trim() || sending ? 0.4 : 1,
            cursor: !draft.trim() || sending ? "default" : "pointer",
          }}
          aria-label="Gửi tin nhắn"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
