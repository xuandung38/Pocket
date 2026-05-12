import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Avatar from "../components/ui/avatar";
import BottomNav from "../components/ui/bottom-nav";
import { currentUser, conversations } from "../data/mock-data";

export default function ChatListScreen() {
  const navigate = useNavigate();

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
          <Avatar src={currentUser.avatar} name={currentUser.name} size={32} />
        </div>
      </div>

      {/* Conversation list */}
      <div className="scroll-area" style={{ flex: 1, paddingBottom: "var(--nav-height)" }}>
        {conversations.map((conv, idx) => (
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
                idx < conversations.length - 1
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
                {conv.lastMessage}
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
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
