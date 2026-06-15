// camera-screen.jsx — shell that owns lifecycle phases, upload pipeline,
// sheet modals, swipe-nav, and gallery fallback.
//
// Camera preview + torch/zoom + record/photo logic now lives in:
//   components/camera/camera-preview/{index,ios,android}.jsx
//   components/camera/use-camera-capture.js
//
// Three lifecycle phases:
//   "preview"  — live viewfinder, capture controls visible
//   "captured" — captured Blob displayed for review, caption + recipients
//   "posting"  — upload + post in flight, controls disabled
//
// Why a single screen (not /camera → /send)?
//   The lovekit source posts straight from the capture screen. Keeping it
//   single-screen lets the existing locket-love design (square viewfinder,
//   bottom-nav, swipe-up to feed) stay intact.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Image as ImageIcon,
  Megaphone,
  Users,
} from "lucide-react";
import Avatar from "../components/ui/avatar";
import CaptureButton from "../components/ui/capture-button";
import BottomNav from "../components/ui/bottom-nav";
import FriendsSheet from "../components/sheets/friends-sheet";
import ProfileSheet from "../components/sheets/profile-sheet";
import CapturedSendPreview from "../components/captured-send-preview";
import {
  SonnerError,
  SonnerSuccess,
  SonnerWarning,
} from "../components/ui/sonner-toast";
import {
  useAuthStore,
  useFriendStoreV2,
  useMomentsStoreV2,
  selectMomentsArray,
  useActivityStore,
  selectActivityUnread,
} from "@/stores";
import {
  createRequestPayloadV5,
  postMoment,
} from "@/services/payload-services";
import { composeFrame } from "@/utils/compose-frame";
import CameraPreview from "../components/camera/camera-preview/index.jsx";
import CameraToggle from "../components/camera/camera-toggle/index.jsx";
import { useCameraCapture } from "../components/camera/use-camera-capture.js";

// Swipe + wheel thresholds for the camera → feed gesture (preserved).
const SWIPE_UP_THRESHOLD = 60;
const WHEEL_THRESHOLD = 30;

export default function CameraScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  // Only animate when arriving from /feed — cold-load shouldn't slide in.
  const enterClass =
    location.key === "default" ? "" : "animate-slide-from-top";

  // -------- UI sheet state --------
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // -------- Capture lifecycle state --------
  const [phase, setPhase] = useState("preview"); // preview | captured | posting
  const [shot, setShot] = useState(null); // { file, url, type: "image"|"video" }
  const [facingMode, setFacingMode] = useState("user");

  // Android-only: lifted here so CameraToggle (flip) and CameraPreview (stream
  // acquire) share the same deviceId. When the toggle resolves a new physical
  // lens via getAvailableCameras() it writes here; the preview re-acquires with
  // the correct deviceId on the next render. iOS never reads this value.
  const [androidDeviceId, setAndroidDeviceId] = useState(null);

  // Last gallery-picked image — used as the gallery-button thumbnail.
  const [galleryThumb, setGalleryThumb] = useState(null);

  // -------- Refs --------
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  // Swipe-up + wheel gesture state (preserved from the original demo).
  const dragStartY = useRef(null);
  const wheelLockedUntil = useRef(0);

  // -------- Stores --------
  const user = useAuthStore((s) => s.user);
  const friends = useFriendStoreV2((s) => s.friends);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const addMoment = useMomentsStoreV2((s) => s.addMoment);
  const momentsMap = useMomentsStoreV2((s) => s.moments);
  const loadInitialMoments = useMomentsStoreV2((s) => s.loadInitial);
  const activityUnread = useActivityStore(selectActivityUnread);

  // Latest moment thumbnail drives the "Lịch sử" pill.
  const latestThumb = useMemo(() => {
    const latest = selectMomentsArray({ moments: momentsMap })[0];
    return (
      latest?.thumbnailUrl ||
      latest?.thumbnail_url ||
      latest?.image_url ||
      latest?.image ||
      null
    );
  }, [momentsMap]);

  // -------- Shared capture hook --------
  // handleCaptureDown/Up, capturePhoto, startRecording, stopRecording,
  // torch state, zoom state — all owned by the hook and forwarded into
  // <CameraPreview> which in turn owns the stream lifecycle.
  const {
    handleCaptureDown,
    handleCaptureUp,
  } = useCameraCapture({ streamRef, videoRef, setShot, setPhase, facingMode });

  // -------- One-shot prefetches --------
  useEffect(() => {
    if (!friends || friends.length === 0) loadFriends?.();
  }, [friends, loadFriends]);

  useEffect(() => {
    if (Object.keys(useMomentsStoreV2.getState().moments).length === 0) {
      loadInitialMoments?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Gallery picker (fallback / desktop) --------
  const openGallery = () => fileInputRef.current?.click();
  const handleGalleryChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      SonnerWarning("Định dạng không hỗ trợ.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (isImage) setGalleryThumb(url);
    setShot({ file, url, type: isVideo ? "video" : "image" });
    setPhase("captured");
  };

  // -------- Reset + post --------
  const resetToPreview = useCallback(() => {
    if (shot?.url) {
      try {
        URL.revokeObjectURL(shot.url);
      } catch {
        /* noop */
      }
    }
    setShot(null);
    setPhase("preview");
  }, [shot]);

  const handlePost = useCallback(
    async ({ caption = "", audience = "all", recipients = [], overlayData = {}, frame, croppedPhoto = null } = {}) => {
      if (!shot?.file) return;
      if (audience === "selected" && recipients.length === 0) {
        SonnerWarning("Hãy chọn ít nhất một người nhận.");
        return;
      }

      setPhase("posting");
      try {
        let fileToUpload = croppedPhoto || shot.file;
        if (shot.type === "image" && frame && frame.type !== "none") {
          const frameSpec = { ...frame };
          if (frameSpec.type === "polaroid") {
            frameSpec.date = new Date().toLocaleDateString("vi-VN");
          }
          try {
            fileToUpload = await composeFrame(fileToUpload, frameSpec);
          } catch (err) {
            console.warn("[camera-screen] composeFrame failed:", err);
            SonnerWarning("Không áp được khung, gửi ảnh gốc.");
            fileToUpload = croppedPhoto || shot.file;
          }
        }

        const payload = await createRequestPayloadV5({
          mediaFile: fileToUpload,
          previewType: shot.type,
          caption,
          overlayData,
          audience,
          recipients,
        });
        if (!payload) throw new Error("Không tạo được payload.");

        const result = await postMoment(payload);
        const moment = result?.data || result;
        if (moment?.id) addMoment(moment);

        SonnerSuccess("Đã gửi", "Khoảnh khắc đang lên Feed…");
        resetToPreview();
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Không gửi được bài đăng.";
        SonnerError("Đăng tải thất bại", msg);
        setPhase("captured");
      }
    },
    [shot, addMoment, resetToPreview],
  );

  // -------- Camera → feed gestures --------
  function handlePointerDown(e) {
    if (phase !== "preview") return;
    dragStartY.current = e.clientY;
  }
  function handlePointerUp(e) {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (dy <= -SWIPE_UP_THRESHOLD) navigate("/feed");
  }
  function handleWheel(e) {
    if (phase !== "preview") return;
    if (Date.now() < wheelLockedUntil.current) return;
    if (e.deltaY >= WHEEL_THRESHOLD) {
      wheelLockedUntil.current = Date.now() + 1000;
      navigate("/feed");
    }
  }

  // -------- Derived --------
  const audienceLabel = `${friends.length} người bạn`;
  const meName = user?.displayName || user?.firstName || "Bạn";
  const meAvatar = user?.profilePic || user?.photoURL || user?.picture || null;

  return (
    <div
      className={enterClass}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => (dragStartY.current = null)}
      onWheel={handleWheel}
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        touchAction: "pan-x",
      }}
    >
      {/* Captured / posting phases — full-screen send-preview overlay */}
      {phase !== "preview" && shot && (
        <CapturedSendPreview
          shot={shot}
          friends={friends}
          isPosting={phase === "posting"}
          onPost={handlePost}
          onCancel={resetToPreview}
        />
      )}

      {/* Preview phase — live camera viewfinder + controls */}
      {phase === "preview" && (
        <>
          {/* Top bar */}
          <div
            style={{
              flexShrink: 0,
              height: 60,
              marginTop: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 16,
              paddingRight: 16,
              zIndex: 10,
            }}
          >
            <button
              className="icon-btn"
              aria-label={
                activityUnread > 0
                  ? `Thông báo (${activityUnread} chưa đọc)`
                  : "Thông báo"
              }
              onClick={() => navigate("/activity")}
              style={{ position: "relative" }}
            >
              <Megaphone size={22} />
              {activityUnread > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    padding: "0 4px",
                    background: "var(--accent-color, #f5a623)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px var(--bg-primary)",
                  }}
                >
                  {activityUnread > 99 ? "99+" : activityUnread}
                </span>
              )}
            </button>
            <button className="pill-btn" onClick={() => setFriendsOpen(true)}>
              <Users size={16} />
              <span>{audienceLabel}</span>
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              aria-label="Hồ sơ"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                borderRadius: "50%",
              }}
            >
              <Avatar src={meAvatar} name={meName} size={38} />
            </button>
          </div>

          {/* Viewfinder — square 1:1, delegates stream + torch + zoom to CameraPreview */}
          <div style={{ flexShrink: 0, padding: "0 12px" }}>
            <div
              style={{
                borderRadius: "calc(var(--radius-card) + 3px)",
                padding: 2,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  paddingBottom: "100%",
                  borderRadius: "var(--radius-card)",
                  overflow: "hidden",
                  background: "#111",
                }}
              >
                {/* Platform-aware preview: iOS uses facingMode, Android uses deviceId + pinch-zoom */}
                <CameraPreview
                  streamRef={streamRef}
                  videoRef={videoRef}
                  facingMode={facingMode}
                  setFacingMode={setFacingMode}
                  setShot={setShot}
                  setPhase={setPhase}
                  deviceId={androidDeviceId}
                  setDeviceId={setAndroidDeviceId}
                />
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 10,
              gap: 10,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                padding: "6px 24px",
              }}
            >
              {/* Gallery picker */}
              <button
                onClick={openGallery}
                aria-label="Mở thư viện"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  border: "2px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                  padding: 0,
                }}
              >
                {galleryThumb || latestThumb ? (
                  <img
                    src={galleryThumb || latestThumb}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <ImageIcon size={22} />
                )}
              </button>

              {/* Press = photo, hold = video — handlers from useCameraCapture */}
              <div
                onPointerDown={handleCaptureDown}
                onPointerUp={handleCaptureUp}
                onPointerLeave={handleCaptureUp}
                style={{ touchAction: "none" }}
              >
                <CaptureButton />
              </div>

              {/* Platform-aware camera flip */}
              <CameraToggle
                facingMode={facingMode}
                setFacingMode={setFacingMode}
                streamRef={streamRef}
                videoRef={videoRef}
                onDeviceId={setAndroidDeviceId}
              />
            </div>

            {/* History pill */}
            <button
              onClick={() => navigate("/feed")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                cursor: "pointer",
                padding: "5px 12px 5px 5px",
                borderRadius: 999,
              }}
            >
              {latestThumb ? (
                <img
                  src={latestThumb}
                  alt=""
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.18)",
                    display: "inline-block",
                  }}
                />
              )}
              <span>Lịch sử</span>
              <ChevronDown size={16} style={{ opacity: 0.7 }} />
            </button>
          </div>

          <BottomNav />
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleGalleryChange}
        style={{ display: "none" }}
      />

      <FriendsSheet open={friendsOpen} onClose={() => setFriendsOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
