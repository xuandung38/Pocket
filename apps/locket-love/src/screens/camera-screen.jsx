// camera-screen.jsx
// Real camera + capture + moment upload pipeline.
//
// Three lifecycle phases drive the layout:
//   "preview"  — live <video> feed from getUserMedia, capture controls visible
//   "captured" — captured Blob displayed for review, caption + recipients
//   "posting"  — upload + post in flight, controls disabled
//
// Why a single screen (not /camera → /send)?
//   The lovekit source posts straight from the capture screen. Keeping it
//   single-screen lets the existing locket-love design (square viewfinder,
//   bottom-nav, swipe-up to feed) stay intact while real capture/upload
//   wraps around it.
//
// `visibilitychange` listener: when the tab loses focus, browsers stop the
// MediaStream; we re-acquire it on focus so the user isn't stuck on a frozen
// frame after switching apps/tabs.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Image as ImageIcon,
  Megaphone,
  RotateCcw,
  Users,
  Zap,
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

// Swipe + wheel thresholds for the existing camera → feed gesture (preserved).
const SWIPE_UP_THRESHOLD = 60;
const WHEEL_THRESHOLD = 30;
// Press-and-hold threshold before a tap escalates into a video recording.
const VIDEO_HOLD_MS = 350;
// Cap recordings so we never queue multi-minute uploads from a single hold.
const MAX_VIDEO_MS = 10_000;

// Default constraints chosen to match Locket native (1080p, square preview).
function buildConstraints(facingMode) {
  return {
    audio: true,
    video: {
      facingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
}

export default function CameraScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  // Only animate when arriving from /feed — cold-load shouldn't slide in.
  const enterClass =
    location.key === "default" ? "" : "animate-slide-from-top";

  // -------- UI sheet state (existing design) --------
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // -------- Capture lifecycle state --------
  const [phase, setPhase] = useState("preview"); // preview | captured | posting
  const [shot, setShot] = useState(null); // { file, url, type: "image"|"video" }
  const [facingMode, setFacingMode] = useState("user");

  // -------- Flash (torch) + zoom — driven by MediaStreamTrack capabilities.
  // Both gracefully no-op when the active track/device doesn't support them
  // (e.g. desktop webcams, most front cameras). --------
  const [flashOn, setFlashOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoomCaps, setZoomCaps] = useState(null); // { min, max, step } | null
  const [zoom, setZoom] = useState(1);
  // Last gallery-picked image — used as the gallery-button thumbnail (Locket
  // shows the most recent photo there, not a generic icon).
  const [galleryThumb, setGalleryThumb] = useState(null);

  // -------- Refs --------
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const holdTimerRef = useRef(null);
  const recordingStartRef = useRef(0);
  const recordingTimeoutRef = useRef(null);
  // Swipe-up + wheel gesture state (preserved from the original demo).
  const dragStartY = useRef(null);
  const wheelLockedUntil = useRef(0);

  const user = useAuthStore((s) => s.user);
  const friends = useFriendStoreV2((s) => s.friends);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const addMoment = useMomentsStoreV2((s) => s.addMoment);
  const momentsMap = useMomentsStoreV2((s) => s.moments);
  const loadInitialMoments = useMomentsStoreV2((s) => s.loadInitial);
  // Notifications now live behind the top-left megaphone (Locket layout); keep
  // its unread badge wired to the activity store.
  const activityUnread = useActivityStore(selectActivityUnread);

  // Latest moment thumbnail drives the "Lịch sử" pill (Locket shows the most
  // recent shot, not a calendar glyph). Image field varies by endpoint.
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

  // ------------------------------------------------------------------
  // Media stream acquisition. We re-acquire on:
  //   - mount
  //   - facing-mode change
  //   - tab visibility regaining focus (browsers stop the stream in bg)
  // ------------------------------------------------------------------
  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        /* noop */
      }
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const acquireStream = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia(
        buildConstraints(facingMode),
      );
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Some browsers (Safari) need an explicit play after srcObject.
        try {
          await videoRef.current.play();
        } catch {
          /* play() can reject when the element is detaching — safe to ignore */
        }
      }

      // Probe the new track for torch + zoom support. A fresh track always
      // starts with flash off and zoom at base, so reset the UI state too.
      const track = stream.getVideoTracks?.()[0];
      const caps = track?.getCapabilities?.() ?? {};
      setTorchSupported(!!caps.torch);
      setFlashOn(false);
      if (caps.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > (caps.zoom.min ?? 1)) {
        setZoomCaps({
          min: caps.zoom.min ?? 1,
          max: caps.zoom.max,
          step: caps.zoom.step ?? 0.1,
        });
        setZoom(caps.zoom.min ?? 1);
      } else {
        setZoomCaps(null);
        setZoom(1);
      }
    } catch (err) {
      console.warn("[camera-screen] getUserMedia failed:", err);
      SonnerWarning(
        "Không truy cập được camera. Hãy cấp quyền hoặc dùng nút thư viện.",
      );
    }
  }, [facingMode, stopStream]);

  // Acquire on mount + facing change; tear down on unmount.
  useEffect(() => {
    if (phase !== "preview") return undefined;
    acquireStream();
    return () => stopStream();
  }, [phase, acquireStream, stopStream]);

  // Re-acquire stream when the tab regains focus — browsers stop tracks
  // when the page is hidden, leaving us with a frozen frame otherwise.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVisibility = () => {
      if (document.visibilityState === "visible" && phase === "preview") {
        acquireStream();
      } else if (document.visibilityState === "hidden") {
        // Stop tracks early so the camera indicator turns off in the OS UI.
        stopStream();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase, acquireStream, stopStream]);

  // One-shot friends prefetch so the recipient picker isn't empty on first
  // capture. Bail out if the store already has data.
  useEffect(() => {
    if (!friends || friends.length === 0) loadFriends?.();
  }, [friends, loadFriends]);

  // One-shot moments prefetch so the "Lịch sử" pill can show the latest shot
  // even on a cold camera load. Read via getState() (not the subscribed map)
  // so an empty first page can't re-trigger the effect into a loop.
  useEffect(() => {
    if (Object.keys(useMomentsStoreV2.getState().moments).length === 0) {
      loadInitialMoments?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Flash (torch) + zoom controls. Both apply live constraints to the active
  // video track; unsupported devices surface a soft warning / no-op.
  // ------------------------------------------------------------------
  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    if (!torchSupported) {
      SonnerWarning("Thiết bị/camera này không hỗ trợ đèn flash.");
      return;
    }
    const next = !flashOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setFlashOn(next);
    } catch (err) {
      console.warn("[camera-screen] torch failed:", err);
      SonnerWarning("Không bật được đèn flash.");
    }
  }, [flashOn, torchSupported]);

  // Preset zoom stops clamped to the device's reported range.
  const zoomLevels = useMemo(() => {
    if (!zoomCaps) return [];
    return [1, 2, 3, 5].filter(
      (z) => z >= (zoomCaps.min ?? 1) && z <= zoomCaps.max,
    );
  }, [zoomCaps]);

  const cycleZoom = useCallback(async () => {
    if (!zoomCaps || zoomLevels.length === 0) return;
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    const idx = zoomLevels.indexOf(zoom);
    const next = zoomLevels[(idx + 1) % zoomLevels.length] ?? zoomLevels[0];
    try {
      await track.applyConstraints({ advanced: [{ zoom: next }] });
      setZoom(next);
    } catch (err) {
      console.warn("[camera-screen] zoom failed:", err);
    }
  }, [zoom, zoomCaps, zoomLevels]);

  // ------------------------------------------------------------------
  // Capture helpers
  // ------------------------------------------------------------------
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror selfie shots so the captured image matches what the user saw.
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        setShot({ file, url, type: "image" });
        setPhase("captured");
      },
      "image/jpeg",
      0.85,
    );
  }, [facingMode]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      recorder.stop();
    } catch {
      /* noop — recorder may already be stopping */
    }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return;

    const mimeCandidates = [
      "video/mp4;codecs=h264,aac",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported?.(m));

    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      console.warn("[camera-screen] MediaRecorder failed to start:", err);
      SonnerWarning("Trình duyệt không hỗ trợ quay video.");
      return;
    }

    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: mimeType?.startsWith("video/mp4") ? "video/mp4" : "video/webm",
      });
      recordedChunksRef.current = [];
      if (!blob.size) return;
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `capture_${Date.now()}.${ext}`, {
        type: blob.type,
      });
      const url = URL.createObjectURL(blob);
      setShot({ file, url, type: "video" });
      setPhase("captured");
    };

    mediaRecorderRef.current = recorder;
    recordingStartRef.current = Date.now();
    recorder.start();

    // Hard cap so a stuck pointer-up doesn't run forever.
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_VIDEO_MS);
  }, [stopRecording]);

  // Pointer-down on the capture button: schedule a tap-vs-hold decision.
  const handleCaptureDown = useCallback(() => {
    if (phase !== "preview") return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      startRecording();
    }, VIDEO_HOLD_MS);
  }, [phase, startRecording]);

  // Pointer-up cancels the hold timer (→ photo) or stops recording (→ video).
  const handleCaptureUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      capturePhoto();
      return;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    stopRecording();
  }, [capturePhoto, stopRecording]);

  // Cleanup any leftover timers + recorder on unmount.
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      stopRecording();
    };
  }, [stopRecording]);

  // ------------------------------------------------------------------
  // Gallery picker (fallback / desktop) — keeps the icon usable when
  // getUserMedia is blocked or unavailable.
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Reset + post
  // ------------------------------------------------------------------
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
        // Bake the chosen frame into the photo before upload.
        // Videos are never framed; "none" is a pass-through (no re-encode).
        //
        // croppedPhoto: pre-cropped 1080² File from the Cropper.js send preview.
        // When present it is used as the base instead of shot.file so
        // composeFrame overlays the frame onto the already-square crop.
        // Fallback to shot.file if the Cropper wasn't ready (e.g. video).
        let fileToUpload = croppedPhoto || shot.file;
        if (shot.type === "image" && frame && frame.type !== "none") {
          const frameSpec = { ...frame };
          // Inject the post timestamp for the polaroid date strip.
          if (frameSpec.type === "polaroid") {
            frameSpec.date = new Date().toLocaleDateString("vi-VN");
          }
          try {
            fileToUpload = await composeFrame(fileToUpload, frameSpec);
          } catch (err) {
            console.warn("[camera-screen] composeFrame failed:", err);
            SonnerWarning("Không áp được khung, gửi ảnh gốc.");
            // fileToUpload falls back to croppedPhoto or shot.file
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

  // ------------------------------------------------------------------
  // Camera → feed gestures (preserved from the original demo screen)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Derived state for the audience pill copy.
  // ------------------------------------------------------------------
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

          {/* Viewfinder — square 1:1 */}
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
                <div style={{ position: "absolute", inset: 0 }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      transform: facingMode === "user" ? "scaleX(-1)" : "none",
                    }}
                  />
                  {/* Flash toggle — top-left, like Locket. Tints yellow when on. */}
                  <button
                    onClick={toggleFlash}
                    aria-label={flashOn ? "Tắt đèn flash" : "Bật đèn flash"}
                    aria-pressed={flashOn}
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.45)",
                      backdropFilter: "blur(6px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: flashOn ? "var(--accent-yellow)" : "#fff",
                    }}
                  >
                    <Zap size={16} fill={flashOn ? "currentColor" : "none"} />
                  </button>

                  {/* Zoom selector — top-right; only shown when the track
                      reports a usable zoom range. Tap cycles preset stops. */}
                  {zoomCaps && zoomLevels.length > 1 && (
                    <button
                      onClick={cycleZoom}
                      aria-label={`Thu phóng ${zoom}x`}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        minWidth: 34,
                        height: 32,
                        padding: "0 8px",
                        borderRadius: 999,
                        border: "none",
                        background: "rgba(0,0,0,0.45)",
                        backdropFilter: "blur(6px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {zoom}×
                    </button>
                  )}
                </div>
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
              {/* Press = photo, hold = video */}
              <div
                onPointerDown={handleCaptureDown}
                onPointerUp={handleCaptureUp}
                onPointerLeave={handleCaptureUp}
                style={{ touchAction: "none" }}
              >
                <CaptureButton />
              </div>
              <button
                onClick={() =>
                  setFacingMode((m) => (m === "user" ? "environment" : "user"))
                }
                aria-label="Đổi camera"
                style={{
                  width: 52,
                  height: 52,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
              >
                <RotateCcw size={28} />
              </button>
            </div>

            {/* History pill — dark rounded pill with the latest thumbnail,
                like Locket. Tap or swipe-up navigates to the feed. */}
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
