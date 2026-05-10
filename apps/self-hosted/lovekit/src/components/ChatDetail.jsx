import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, User } from "lucide-react";
import clsx from "clsx";
import MessageBubble from "@/components/MessageBubble";
import ChatInputBar from "@/components/ChatInputBar";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { sendMessage, markReadMessage } from "@/services";
import { useMessagesStore } from "@/stores/useMessagesStore";

const myId = () => localStorage.getItem("localId");

function HeaderAvatar({ url, name }) {
  return (
    <div className="size-9 rounded-full bg-base-200 overflow-hidden flex items-center justify-center text-base-content/60">
      {url ? (
        <img src={url} alt={name || "user"} className="w-full h-full object-cover" />
      ) : (
        <User className="size-5" strokeWidth={1.75} />
      )}
    </div>
  );
}

export default function ChatDetail({
  conversation,
  friend,
  open,
  onClose,
  className,
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  const { messages, getMessagesByUser, addMessageWithUserV2 } =
    useMessagesStore();

  const conversationId = conversation?.uid;
  const list = conversationId ? messages[conversationId] || [] : [];

  const sorted = useMemo(
    () =>
      [...list]
        .filter((m) => m && m.id)
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt)),
    [list],
  );

  // Slide animation: mount fully translated, animate next frame
  useEffect(() => {
    if (open) {
      setAnimate(false);
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
    setAnimate(false);
  }, [open]);

  // Load messages when opening
  useEffect(() => {
    if (!open || !conversationId) return;
    let cancelled = false;
    setLoading(true);
    getMessagesByUser(conversationId)
      .catch((err) => console.error("getMessagesByUser failed:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (conversation?.isRead === false) {
      markReadMessage(conversationId).catch((err) =>
        console.error("markReadMessage failed:", err),
      );
    }
    return () => {
      cancelled = true;
    };
  }, [open, conversationId, conversation?.isRead, getMessagesByUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [sorted.length, open]);

  const handleSend = async (text) => {
    if (!conversation || !friend?.uid) return;
    try {
      await sendMessage({
        sender: myId(),
        receiver_uid: friend.uid,
        message: text,
      });

      const optimistic = {
        id: `local-${Date.now()}`,
        uid: conversationId,
        body: text,
        sender: myId(),
        createdAt: Math.floor(Date.now() / 1000),
        update_time: Date.now(),
      };
      await addMessageWithUserV2(conversationId, optimistic);
    } catch (err) {
      console.error("send message failed:", err);
    }
  };

  const fullName =
    [friend?.firstName, friend?.lastName].filter(Boolean).join(" ") || "Chat";
  const me = myId();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${fullName}`}
      className={clsx(
        "fixed inset-0 z-40 flex flex-col bg-base-100",
        "transition-transform duration-300 ease-out",
        open && animate ? "translate-x-0" : "translate-x-full",
        className,
      )}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-3 border-b border-base-200 bg-base-100">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="size-9 rounded-full flex items-center justify-center hover:bg-base-200 active:bg-base-300 transition-colors"
        >
          <ChevronLeft className="size-6" />
        </button>
        <HeaderAvatar url={friend?.profilePic} name={fullName} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-base-content">{fullName}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 pb-28"
      >
        {loading && sorted.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="line" className="w-1/2 h-6" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-base-content/50">
            Chưa có tin nhắn nào
          </div>
        ) : (
          sorted.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender === me}
            />
          ))
        )}
      </div>

      <ChatInputBar onSubmit={handleSend} disabled={!conversation} />
    </div>
  );
}
