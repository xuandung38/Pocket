import { useEffect } from "react";
import clsx from "clsx";
import { LogOut, X } from "lucide-react";

export default function SettingsSheet({ open, onClose, onLogout, className }) {
  // Lock body scroll while open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleLogout = () => {
    try {
      localStorage.clear();
    } catch (err) {
      console.error("localStorage.clear failed:", err);
    }
    onLogout?.();
    onClose?.();
  };

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        aria-hidden={!open}
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-base-100 border-t border-base-200",
          "shadow-[0_-8px_32px_-8px_rgba(249,115,22,0.25)]",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
          className,
        )}
      >
        <div className="flex flex-col px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-base-300 mb-4" />

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Cài đặt</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="size-9 rounded-full hover:bg-base-200 flex items-center justify-center text-base-content/70"
            >
              <X className="size-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 flex items-center justify-center gap-2 shadow-[0_8px_20px_-6px_rgba(245,158,11,0.55)] active:scale-[0.99] transition"
          >
            <LogOut className="size-5" strokeWidth={2.25} />
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  );
}
