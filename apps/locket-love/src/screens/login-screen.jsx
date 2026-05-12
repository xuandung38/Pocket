import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuthStore } from "@/stores";
import { SonnerError, SonnerSuccess } from "@/components/ui/sonner-toast";

// Login screen — accepts email or phone, routes to the right backend endpoint.
// On success: hydrates auth store + navigates to camera.
// On failure: surfaces inline error + toast.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d[\d\s().-]{4,}$/;

export default function LoginScreen() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  // identifier = email or phone number — both formats accepted
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    identifier.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmed = identifier.trim();
    if (!EMAIL_RE.test(trimmed) && !PHONE_RE.test(trimmed)) {
      setError("Email hoặc số điện thoại không hợp lệ");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const user = await login({ identifier: trimmed, password, rememberMe: true });
      SonnerSuccess(
        "Đăng nhập thành công!",
        user?.displayName ? `Xin chào ${user.displayName}!` : undefined,
      );
      navigate("/", { replace: true });
    } catch (err) {
      const status = err?.status;
      let msg;
      if (status === 400) msg = "Tài khoản hoặc mật khẩu không đúng!";
      else if (status === 401) msg = "Phiên đăng nhập đã hết hạn.";
      else if (status === 404) msg = "Tài khoản không tồn tại!";
      else if (status === 429) msg = "Bạn thử quá nhiều lần. Vui lòng đợi.";
      else if (status >= 500) msg = "Lỗi máy chủ. Thử lại sau!";
      else msg = err?.message || "Đăng nhập thất bại!";
      setError(msg);
      SonnerError(msg);
    } finally {
      setSubmitting(false);
    }
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
        noValidate
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
          disabled={submitting}
          style={inputStyle}
        />
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Đang đăng nhập…</span>
            </>
          ) : (
            "Đăng nhập"
          )}
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
