import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Loader2, MessageCircle, RotateCcw, Send, Settings, Image as ImageIcon, Users, X } from "lucide-react";
import CameraPreview from "@/components/CameraPreview";
import CaptureButton from "@/components/CaptureButton";
import CaptionInput from "@/components/CaptionInput";
import FriendAvatar from "@/components/FriendAvatar";
import FriendPickerSheet from "@/components/FriendPickerSheet";
import FriendMomentRow from "@/components/FriendMomentRow";
import UploadProgressChip from "@/components/UploadProgressChip";
import { defaultPostOverlay } from "@/stores/usePost";
import { useAuthStore, useFriendStoreV2, useUploadQueueStore } from "@/stores";
import { createRequestPayloadV5 } from "@/services";
import { useApp } from "@/context/AppContext";
import {
  SonnerError,
  SonnerSuccess,
  SonnerWarning,
} from "@/components/ui/SonnerToast";

const SWIPE_HINT_KEY = "lk:swipe-hint-seen";

export default function CameraScreen({ className, isActive = true, onNavigate }) {
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);

  const [phase, setPhase] = useState("preview");
  const [shot, setShot] = useState(null);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("all");
  const [recipients, setRecipients] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const user = useAuthStore((s) => s.user);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const friendsLoaded = useFriendStoreV2(
    (s) => Object.keys(s.friendDetailsMap || {}).length,
  );
  const enqueueUploadItem = useUploadQueueStore((s) => s.enqueueUploadItem);

  // AppContext.post drives CropImageStudio (mounted at App.jsx by dev-7).
  // Safe-access: if AppProvider isn't wrapped yet, crop flow is bypassed.
  const app = useApp();
  const postCtx = app?.post;

  useEffect(() => {
    if (!friendsLoaded) loadFriends?.();
  }, [friendsLoaded, loadFriends]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(SWIPE_HINT_KEY);
      if (!seen) {
        setShowSwipeHint(true);
        window.localStorage.setItem(SWIPE_HINT_KEY, "1");
      }
    } catch {
      /* noop */
    }
  }, []);

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

  const handleGalleryClick = () => fileInputRef.current?.click();

  const handleGalleryChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      SonnerWarning("Định dạng không hỗ trợ.");
      return;
    }
    // Route still images through CropImageStudio when AppContext is available;
    // videos and the no-provider fallback go straight to captured phase.
    if (isImage && postCtx?.setImageToCrop) {
      postCtx.setImageToCrop(URL.createObjectURL(file));
      return;
    }
    const url = URL.createObjectURL(file);
    handleCapture({ type: isVideo ? "video" : "image", file, url });
  };

  // Bridge AppContext.post (set by CropImageStudio after crop confirm)
  // back into local shot state so the existing captured-phase UI works unchanged.
  useEffect(() => {
    if (!postCtx) return;
    const file = postCtx.selectedFile;
    const preview = postCtx.preview;
    if (!file || preview?.type !== "image" || !preview?.data) return;
    handleCapture({ type: "image", file, url: preview.data });
    // Clear post state to avoid re-triggering on re-renders.
    postCtx.setSelectedFile?.(null);
    postCtx.setPreview?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postCtx?.selectedFile, postCtx?.preview]);

  const handleFlip = () =>
    setFacingMode((m) => (m === "user" ? "environment" : "user"));

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
      SonnerSuccess("Đã thêm vào hàng đợi!", "Bài viết đang được tải lên...");
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

  const meName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.displayName ||
    "You";
  const meAvatar = user?.profilePic || user?.photoURL || user?.picture || null;

  return (
    <section
      role="tabpanel"
      aria-label="Capture"
      className={clsx(
        "flex flex-col h-full bg-base-100 text-base-content overflow-hidden",
        "pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      <header className="flex items-center justify-between px-4 pt-2 pb-2">
        <button
          type="button"
          onClick={() => onNavigate?.("profile")}
          aria-label="Hồ sơ"
          className="rounded-full active:scale-95 transition-transform"
        >
          <FriendAvatar src={meAvatar} name={meName} size="md" />
        </button>
        <h1 className="font-semibold text-lg">Lovekit</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.("messages")}
            aria-label="Tin nhắn"
            className="size-10 rounded-full bg-base-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <MessageCircle className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => onNavigate?.("profile")}
            className="size-10 rounded-full bg-base-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Settings className="size-5" />
          </button>
        </div>
      </header>

      <div className="px-4 flex justify-center">
        <UploadProgressChip />
      </div>

      <div className="flex justify-center py-3">
        <div
          className={clsx(
            "relative w-[88vw] max-w-[440px] aspect-square mx-auto",
            "rounded-3xl overflow-hidden",
            "ring-4 ring-primary/40 shadow-lg shadow-primary/30",
            "bg-base-200",
          )}
        >
          {phase === "preview" && (
            <CameraPreview
              ref={previewRef}
              active={isActive}
              facingMode={facingMode}
            />
          )}

          {phase !== "preview" && shot && (
            <>
              {shot.type === "image" ? (
                <img
                  src={shot.url}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <video
                  src={shot.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {phase === "captured" && (
                <button
                  type="button"
                  onClick={resetToPreview}
                  aria-label="Hủy"
                  className="absolute top-3 right-3 size-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white"
                >
                  <X className="size-4" />
                </button>
              )}

              {phase === "posting" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white">
                  <Loader2 className="size-8 animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {phase === "captured" && (
        <div className="px-6 pb-2">
          <CaptionInput value={caption} onChange={setCaption} />
        </div>
      )}

      <div className="flex items-center justify-around px-8 py-4">
        {phase === "preview" && (
          <>
            <button
              type="button"
              onClick={handleGalleryClick}
              aria-label="Mở thư viện"
              className="size-12 rounded-full bg-base-200 flex items-center justify-center active:scale-95 transition-transform"
            >
              <ImageIcon className="size-5" />
            </button>
            <CaptureButton getVideo={getVideo} mirror={facingMode === "user"} onCapture={handleCapture} />
            <button
              type="button"
              onClick={handleFlip}
              aria-label="Đổi camera"
              className="size-12 rounded-full bg-base-200 flex items-center justify-center active:scale-95 transition-transform"
            >
              <RotateCcw className="size-5" />
            </button>
          </>
        )}

        {phase === "captured" && (
          <>
            <button
              type="button"
              onClick={resetToPreview}
              aria-label="Chụp lại"
              className="size-12 rounded-full bg-base-200 flex items-center justify-center"
            >
              <RotateCcw className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex-1 mx-4 rounded-full px-4 py-3 bg-base-200 text-base-content flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <Users className="size-4" />
              <span className="truncate">Gửi tới: {audienceLabel}</span>
            </button>
            <button
              type="button"
              onClick={handlePost}
              aria-label="Gửi"
              className="size-12 rounded-full flex items-center justify-center bg-primary text-primary-content shadow-lg shadow-primary/40 active:scale-95 transition-transform"
            >
              <Send className="size-5" />
            </button>
          </>
        )}

        {phase === "posting" && (
          <div className="flex-1 flex items-center justify-center gap-2 text-base-content/70 text-sm font-medium">
            <Loader2 className="size-5 animate-spin" />
            Đang gửi…
          </div>
        )}
      </div>

      <FriendMomentRow />

      {showSwipeHint && phase === "preview" && (
        <div className="flex justify-center pb-3 text-xs text-base-content/50 animate-pulse select-none">
          <span>↑ Vuốt lên để xem Feed</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleGalleryChange}
        className="hidden"
      />

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
