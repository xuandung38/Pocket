import clsx from "clsx";
import { Loader2, AlertCircle } from "lucide-react";
import { STATUS_UPLOAD_MOMENT, useUploadQueueStore } from "@/stores";

export default function UploadProgressChip({ className }) {
  const items = useUploadQueueStore((s) => s.uploadItems);

  const pending = items.filter(
    (i) =>
      i.status === STATUS_UPLOAD_MOMENT.QUEUED ||
      i.status === STATUS_UPLOAD_MOMENT.UPLOADING,
  );
  const failed = items.filter((i) => i.status === STATUS_UPLOAD_MOMENT.FAILED);

  if (pending.length === 0 && failed.length === 0) return null;

  const isFailed = pending.length === 0 && failed.length > 0;
  const Icon = isFailed ? AlertCircle : Loader2;
  const label = isFailed
    ? `Lỗi ${failed.length}`
    : `Đang tải ${pending.length}`;

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "text-xs font-semibold",
        "backdrop-blur-md border",
        isFailed
          ? "bg-red-500/30 border-red-300/30 text-red-50"
          : "bg-black/45 border-white/15 text-white",
        className,
      )}
    >
      <Icon
        className={clsx("size-3.5", !isFailed && "animate-spin")}
        strokeWidth={2.5}
      />
      <span>{label}</span>
    </div>
  );
}
