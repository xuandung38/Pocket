import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Loader2, RotateCcw, Send, Users, X } from "lucide-react";
import CameraPreview from "@/components/CameraPreview";
import CaptureButton from "@/components/CaptureButton";
import CaptionInput from "@/components/CaptionInput";
import FriendPickerSheet from "@/components/FriendPickerSheet";
import UploadProgressChip from "@/components/UploadProgressChip";
import { defaultPostOverlay } from "@/stores/usePost";
import {
  useFriendStoreV2,
  useUploadQueueStore,
} from "@/stores";
import { createRequestPayloadV5 } from "@/services";
import {
  SonnerError,
  SonnerSuccess,
  SonnerWarning,
} from "@/components/ui/SonnerToast";

export default function CameraScreen({ className }) {
  const previewRef = useRef(null);

  const [phase, setPhase] = useState("preview"); // "preview" | "captured" | "posting"
  const [shot, setShot] = useState(null); // { type, file, url }
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("all");
  const [recipients, setRecipients] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const friendsLoaded = useFriendStoreV2(
    (s) => Object.keys(s.friendDetailsMap || {}).length,
  );
  const enqueueUploadItem = useUploadQueueStore((s) => s.enqueueUploadItem);

  useEffect(() => {
    if (!friendsLoaded) loadFriends?.();
  }, [friendsLoaded, loadFriends]);

  const getVideo = useCallback(() => previewRef.current?.video || null, []);

  const handleCapture = useCallback((data) => {
    setShot(data);
    setPhase("captured");
  }, []);

  const resetToPreview = useCallback(() => {
    if (shot?.url) {
      try { URL.revokeObjectURL(shot.url); } catch { /* noop */ }
    }
    setShot(null);
    setCaption("");
    setPhase("preview");
  }, [shot]);

  const handlePost = useCallback(async () => {
    if (!shot?.file) return;

    if (audience === "selected" && recipients.length === 0) {
      SonnerWarning("Hãy chọn ít nhất một người nhận.");
      return;
    }

    setPhase("posting");
    try {
      const overlay = { ...defaultPostOverlay, caption };
      const payload = await createRequestPayloadV5(
        shot.file,
        shot.type,
        overlay,
        audience,
        recipients,
      );
      if (!payload) throw new Error("Không tạo được payload.");

      await enqueueUploadItem(payload);
      SonnerSuccess(
        "Đã thêm vào hàng đợi!",
        "Bài viết đang được tải lên...",
      );
      resetToPreview();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không gửi được bài đăng.";
      SonnerError("Đăng tải thất bại", msg);
      setPhase("captured");
    }
  }, [shot, caption, audience, recipients, enqueueUploadItem, resetToPreview]);

  const audienceLabel =
    audience === "all"
      ? "Tất cả bạn bè"
      : recipients.length === 1
      ? "1 người"
      : `${recipients.length} người`;

  return (
    <section
      role="tabpanel"
      aria-label="Capture"
      className={clsx(
        "absolute inset-0 bg-black text-white overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0">
        <CameraPreview
          ref={previewRef}
          active
          facingMode="user"
        />
      </div>

      {phase !== "preview" && shot && (
        <div className="absolute inset-0 bg-black">
          {shot.type === "image" ? (
            <img
              src={shot.url}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={shot.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      <div className="absolute top-0 inset-x-0 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3 flex items-center justify-between z-10">
        <UploadProgressChip />
        {phase === "captured" && (
          <button
            type="button"
            onClick={resetToPreview}
            aria-label="Hủy"
            className="size-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {phase === "captured" && (
        <div className="absolute left-0 right-0 bottom-32 px-6 z-10">
          <CaptionInput value={caption} onChange={setCaption} />
        </div>
      )}

      <div className="absolute left-0 right-0 bottom-6 px-6 z-10 flex items-center justify-between gap-4">
        {phase === "preview" && (
          <>
            <div className="size-14" />
            <CaptureButton
              getVideo={getVideo}
              mirror
              onCapture={handleCapture}
            />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Chọn người nhận"
              className="size-14 rounded-full bg-black/45 backdrop-blur-md flex flex-col items-center justify-center text-white"
            >
              <Users className="size-5" />
              <span className="text-[10px] font-semibold mt-0.5 truncate max-w-12">
                {audience === "all" ? "Tất cả" : recipients.length || ""}
              </span>
            </button>
          </>
        )}

        {phase === "captured" && (
          <>
            <button
              type="button"
              onClick={resetToPreview}
              aria-label="Chụp lại"
              className="size-14 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white"
            >
              <RotateCcw className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={clsx(
                "flex-1 rounded-full px-4 py-3",
                "bg-black/45 backdrop-blur-md text-white",
                "flex items-center justify-center gap-2 text-sm font-semibold",
              )}
            >
              <Users className="size-4" />
              <span className="truncate">Gửi tới: {audienceLabel}</span>
            </button>

            <button
              type="button"
              onClick={handlePost}
              disabled={phase === "posting"}
              aria-label="Gửi"
              className={clsx(
                "size-14 rounded-full flex items-center justify-center",
                "bg-primary text-primary-content",
                "shadow-[0_8px_20px_-6px_rgba(249,115,22,0.55)]",
                "active:scale-95 transition disabled:opacity-60",
              )}
            >
              <Send className="size-5" />
            </button>
          </>
        )}

        {phase === "posting" && (
          <div className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-medium">
            <Loader2 className="size-5 animate-spin" />
            Đang gửi…
          </div>
        )}
      </div>

      <FriendPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        audience={audience}
        selectedIds={recipients}
        onChange={({ audience: a, selectedIds }) => {
          setAudience(a);
          setRecipients(selectedIds);
        }}
      />
    </section>
  );
}
