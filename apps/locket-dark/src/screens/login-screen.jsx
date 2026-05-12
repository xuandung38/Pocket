import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Eye, EyeOff } from "lucide-react";

// Simple login screen — username + password only.
// Mocked auth: any non-empty pair signs in and navigates to camera.

export default function LoginScreen() {
  const navigate = useNavigate();
  // identifier = email or phone number — both formats accepted
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = identifier.trim().length > 0 && password.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    // Mock auth — accept anything
    setError("");
    localStorage.setItem("locket-auth", "1");
    navigate("/", { replace: true });
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, #1a0d2e 0%, #0c0c0c 60%)",
        display: "flex",
        flexDirection: "column",
        padding: "0 24px",
      }}
    >
      {/* Logo + brand */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 32,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            background: "linear-gradient(135deg, #f5a623 0%, #e87d20 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            boxShadow: "0 8px 32px rgba(245,166,35,0.35)",
          }}
        >
          <Heart size={48} color="#000" fill="#000" />
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>Locket</div>
        <div
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            textAlign: "center",
            marginTop: 8,
            maxWidth: 280,
            lineHeight: 1.45,
          }}
        >
          Khoảnh khắc trực tiếp từ bạn bè trên màn hình chính
        </div>
      </div>

      {/* Login form */}
      <form
        onSubmit={handleSubmit}
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 40,
        }}
      >
        <input
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Email hoặc số điện thoại"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          style={inputStyle}
        />
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, paddingRight: 48 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              padding: 8,
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", paddingLeft: 4 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            background: canSubmit ? "var(--accent-yellow)" : "rgba(245,166,35,0.3)",
            color: canSubmit ? "#000" : "rgba(0,0,0,0.4)",
            border: "none",
            borderRadius: 999,
            padding: "16px 0",
            fontSize: 16,
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "default",
            marginTop: 8,
          }}
        >
          Đăng nhập
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "none",
  outline: "none",
  color: "#fff",
  fontSize: 16,
  fontWeight: 500,
  borderRadius: 14,
  padding: "16px 18px",
  boxSizing: "border-box",
  colorScheme: "dark",
};
