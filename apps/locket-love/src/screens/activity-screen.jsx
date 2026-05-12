// Activity tab — stub placeholder.
// Real implementation owned by Phase 7 (reactions + activity).
export default function ActivityScreen() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary, #0c0c0c)",
        color: "var(--text-secondary, rgba(255,255,255,0.5))",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
        Hoạt động
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
        Phản ứng và lời nhắn cho khoảnh khắc của bạn sẽ xuất hiện ở đây.
      </div>
    </div>
  );
}
