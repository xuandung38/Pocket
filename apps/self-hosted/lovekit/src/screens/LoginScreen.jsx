import { useState } from "react";
import { Eye, EyeOff, Heart, Loader2 } from "lucide-react";
import WarmCard from "@/components/ui/WarmCard";
import { SonnerError, SonnerSuccess } from "@/components/ui/SonnerToast";
import { loginWithEmail } from "@/services";
import { saveToken } from "@/utils";
import { useAuthStore } from "@/stores";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onLogin }) {
  const init = useAuthStore((s) => s.init);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!EMAIL_RE.test(email)) {
      SonnerError("Email không hợp lệ!");
      return;
    }
    if (!password) {
      SonnerError("Vui lòng nhập mật khẩu");
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginWithEmail({ email, password, captchaToken: null });
      const data = res?.data ?? res;
      if (!data?.idToken || !data?.localId) {
        throw new Error("Server không trả về token hợp lệ");
      }

      saveToken(
        {
          idToken: data.idToken,
          localId: data.localId,
          refreshToken: data.refreshToken,
        },
        true,
      );

      SonnerSuccess(
        "Đăng nhập thành công!",
        `Xin chào ${data?.displayName || "bạn"}!`,
      );

      hydrate?.();
      try {
        await init?.();
      } catch (initErr) {
        console.error("Auth init failed:", initErr);
        SonnerError("Failed to load profile");
      }
      onLogin?.();
    } catch (err) {
      const status = err?.status;
      if (status === 400) SonnerError("Tài khoản hoặc mật khẩu không đúng!");
      else if (status === 401) SonnerError("Phiên đăng nhập đã hết hạn.");
      else if (status === 404) SonnerError("Tài khoản không tồn tại!");
      else if (status === 429) SonnerError("Bạn thử quá nhiều lần. Vui lòng đợi.");
      else if (status === 500) SonnerError("Lỗi máy chủ. Thử lại sau!");
      else SonnerError(err?.message || "Đăng nhập thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center px-6 py-10 bg-base-100 text-base-content">
      <WarmCard className="w-full max-w-md p-7" padded={false}>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-14 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(249,115,22,0.55)] mb-3">
            <Heart className="size-7" strokeWidth={2.25} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Lovekit</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Đăng nhập để chia sẻ khoảnh khắc cùng người thân yêu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="mt-1 w-full rounded-2xl bg-base-200/60 border border-base-200 focus:border-primary focus:bg-base-100 outline-none px-4 py-3 text-base font-medium placeholder:font-normal placeholder:opacity-60 transition"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Mật khẩu</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl bg-base-200/60 border border-base-200 focus:border-primary focus:bg-base-100 outline-none pl-4 pr-12 py-3 text-base font-medium placeholder:font-normal placeholder:opacity-60 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-base-content/60 hover:text-base-content"
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary text-primary-content font-semibold text-base py-3 shadow-[0_8px_20px_-6px_rgba(249,115,22,0.55)] hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Đang đăng nhập…
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>
      </WarmCard>
    </div>
  );
}
