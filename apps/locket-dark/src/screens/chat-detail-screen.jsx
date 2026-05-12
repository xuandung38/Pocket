import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import Avatar from "../components/ui/avatar";
import ChatBubble from "../components/ui/chat-bubble";
import { conversations, chatMessages } from "../data/mock-data";

export default function ChatDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const conv = conversations.find((c) => c.id === id) || conversations[0];
  const friend = conv?.friend;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

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
      {/* Header — pushed down for safe-area breathing room (see docs/design-patterns.md §1.1) */}
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
        <Avatar src={friend?.avatar} name={friend?.name} size={32} />
        <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{friend?.name}</span>
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            className="icon-btn"
            onClick={() => setShowMenu((v) => !v)}
            style={{ background: "none", backdropFilter: "none" }}
          >
            <MoreHorizontal size={22} />
          </button>

          {/* More-options dropdown */}
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

      {/* Message list */}
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
        {chatMessages.map((msg) => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.senderId === "me"}
            showAvatar={msg.isFirst}
            friend={friend}
          />
        ))}
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
        <div
          style={{
            flex: 1,
            background: "var(--bg-surface)",
            borderRadius: 9999,
            padding: "10px 16px",
            fontSize: 15,
            color: "var(--text-secondary)",
          }}
        >
          Gửi tin nhắn...
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["🔥", "😍", "💛"].map((e) => (
            <span key={e} style={{ fontSize: 22 }}>{e}</span>
          ))}
          <span style={{ fontSize: 15, color: "var(--text-secondary)", alignSelf: "center" }}>
            GIF
          </span>
        </div>
      </div>
    </div>
  );
}
