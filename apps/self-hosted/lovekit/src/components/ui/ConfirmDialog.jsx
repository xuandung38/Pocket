import clsx from "clsx";
import { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title = "Xác nhận",
  message,
  confirmText = "Xoá",
  cancelText = "Huỷ",
  destructive = true,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onCancel?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className={clsx(
          "w-full max-w-xs rounded-3xl bg-base-100 text-base-content",
          "shadow-[0_8px_32px_-8px_rgba(249,115,22,0.35)]",
          "border border-base-200",
          "px-6 py-5",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-title"
          className="text-base font-semibold mb-1 text-center"
        >
          {title}
        </h2>
        {message && (
          <p className="text-sm text-base-content/70 text-center mb-5">
            {message}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={clsx(
              "w-full py-3 rounded-2xl font-semibold text-sm transition active:scale-[0.98]",
              destructive
                ? "bg-error text-error-content"
                : "bg-primary text-primary-content",
            )}
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 rounded-2xl font-semibold text-sm bg-base-200 text-base-content/80 active:scale-[0.98] transition"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
