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
import { ChevronLeft, MoreHorizontal, Send } from "lucide-react";
import Avatar from "../components/ui/avatar";
import ChatBubble from "../components/ui/chat-bubble";
import { useAuthStore, useFriendStoreV2 } from "@/stores";
import { getToken } from "@/utils";
import { sendMessage, markReadMessage } from "@/services";
import {
  connectSocket,
  emitGetMessagesWith,
  emitTyping,
  onMessage,
} from "@/services/socket-service";

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
  const user = useAuthStore((s) => s.user);
  const myUid = user?.uid || user?.localId || "me";

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

  // Local message list — newest at index 0 to match backend ordering.
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const listEndRef = useRef(null);

  // --- Socket subscription -------------------------------------------------
  useEffect(() => {
    if (!friendUid) return undefined;
    const { idToken } = getToken();
    if (!idToken) return undefined;

    connectSocket(idToken);

    // Append incoming messages (de-dup by id). The backend sends history +
    // live updates on the same event channel.
    const off = onMessage((data) => {
      if (!data) return;
      const items = Array.isArray(data) ? data : [data];
      // Only accept messages relevant to this conversation. Backend sends
      // all observed messages; filter by sender/receiver matching peer or me.
      const relevant = items.filter((m) => {
        if (!m?.id) return false;
        const me = myUid;
        return (
          m.sender === friendUid ||
          m.sender === me ||
          m.receiver_uid === friendUid ||
          m.receiverUid === friendUid
        );
      });
      if (!relevant.length) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const msg of relevant) {
          if (seen.has(msg.id)) {
            // Update in place — server may emit reaction edits.
            const idx = merged.findIndex((m) => m.id === msg.id);
            if (idx >= 0) merged[idx] = { ...merged[idx], ...msg };
          } else {
            merged.unshift(msg);
            seen.add(msg.id);
          }
        }
        // Keep newest first.
        return merged.sort(
          (a, b) =>
            Number(b.createdAt || b.update_time || 0) -
            Number(a.createdAt || a.update_time || 0),
        );
      });
    });

    emitGetMessagesWith(friendUid);

    // Best-effort read-receipt. We swallow failures inside markReadMessage.
    markReadMessage(friendUid);

    return () => {
      off?.();
    };
  }, [friendUid, myUid]);

  // Scroll-to-bottom when new messages arrive. Newest sits at the bottom of
  // the visible column (rendered in reverse below).
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // --- Outgoing send -------------------------------------------------------
  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !friendUid) return;

    // Optimistic local append. We use a temporary id; backend echo will
    // overwrite via the dedupe-by-id branch in the socket handler above
    // once the real id arrives.
    const tmpId = `tmp-${Date.now()}`;
    const nowSecs = Math.floor(Date.now() / 1000);
    const optimistic = {
      id: tmpId,
      body: text,
      sender: myUid,
      createdAt: nowSecs,
      update_time: nowSecs,
      type: "text",
      _pending: true,
    };
    setMessages((prev) => [optimistic, ...prev]);
    setDraft("");
    setSending(true);

    try {
      await sendMessage({ receiver_uid: friendUid, message: text });
      // Real message will come back via socket. Drop the optimistic stub
      // once a real one with matching body+sender arrives — for now, mark
      // the optimistic as delivered (no longer pending) so the UI doesn't
      // show a stale spinner if socket is slow.
      setMessages((prev) =>
        prev.map((m) => (m.id === tmpId ? { ...m, _pending: false } : m)),
      );
    } catch (err) {
      console.error("[chat-detail] send failed:", err?.message);
      // Rollback optimistic message + restore draft so user can retry.
      setMessages((prev) => prev.filter((m) => m.id !== tmpId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }, [draft, sending, friendUid, myUid]);

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
        style={{
          flex: 1,
          padding: "8px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          paddingBottom: 80,
        }}
      >
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
