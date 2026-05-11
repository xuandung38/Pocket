import Avatar from "./avatar";

// Star rating display used in photo messages
function StarRating({ count = 5 }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: i < count ? "#f5a623" : "#555" }}>
          ★
        </span>
      ))}
    </div>
  );
}

// Individual chat message bubble
// own=true → yellow bubble on right; own=false → dark bubble on left with avatar
export default function ChatBubble({ msg, isOwn, showAvatar, friend }) {
  const hasImage = !!msg.image;
  const hasText = !!msg.text;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 4,
      }}
    >
      {/* Avatar for friend — only shown on first message in group */}
      {!isOwn && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && <Avatar src={friend?.avatar} name={friend?.name} size={28} />}
        </div>
      )}

      <div
        style={{
          maxWidth: "72%",
          display: "flex",
          flexDirection: "column",
          alignItems: isOwn ? "flex-end" : "flex-start",
        }}
      >
        {/* Timestamp header */}
        {msg.time && (
          <span
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginBottom: 6,
              alignSelf: "center",
            }}
          >
            {msg.time}
          </span>
        )}

        {/* Image message */}
        {hasImage && (
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              width: 180,
              background: "var(--bg-elevated)",
            }}
          >
            <img
              src={msg.image}
              alt="photo"
              style={{ width: "100%", display: "block" }}
            />
            {msg.caption && (
              <div
                style={{
                  padding: "6px 12px 8px",
                  background: "var(--bg-elevated)",
                }}
              >
                {msg.rating && <StarRating count={msg.rating} />}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  " {msg.caption} "
                </span>
              </div>
            )}
          </div>
        )}

        {/* Text message */}
        {hasText && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: isOwn
                ? "20px 20px 6px 20px"
                : "20px 20px 20px 6px",
              background: isOwn ? "var(--bubble-own-bg)" : "var(--bubble-other-bg)",
              color: isOwn ? "var(--bubble-own-text)" : "var(--bubble-other-text)",
              fontSize: 15,
              lineHeight: 1.4,
            }}
          >
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
