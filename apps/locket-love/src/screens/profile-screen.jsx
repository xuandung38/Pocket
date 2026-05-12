// Profile tab — stub placeholder.
// Profile UX in this codebase mostly lives in `components/sheets/profile-sheet.jsx`
// (bottom-sheet pattern). This screen is the tab-route landing page; real
// content (avatar, stats, settings entry points) lands in Phase 8 polish.
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

export default function ProfileScreen() {
  const navigate = useNavigate();
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
      <User size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
        Hồ sơ
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 280, marginBottom: 20 }}>
        Trang hồ sơ đầy đủ sẽ có trong bản cập nhật tiếp theo.
      </div>
      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          background: "var(--accent-yellow, #f5a623)",
          color: "#000",
          border: "none",
          borderRadius: 999,
          padding: "10px 22px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Về camera
      </button>
    </div>
  );
}
