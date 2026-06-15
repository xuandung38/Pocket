// iOS camera preview — uses facingMode (user/environment) toggling.
// torch/zoom delegated to useCameraCapture; no deviceId selection needed on iOS
// because Safari's facingMode API is more reliable than deviceId on iOS Safari.
import { useCallback, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { SonnerWarning } from "../../ui/sonner-toast";
import { useCameraCapture } from "../use-camera-capture.js";

// Default constraints: 1080p square-ish + 30fps cap to match Locket native feel.
function buildConstraints(facingMode) {
  return {
    audio: true,
    video: {
      facingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
    },
  };
}

/**
 * @param {{
 *   streamRef:     React.RefObject<MediaStream|null>,
 *   videoRef:      React.RefObject<HTMLVideoElement|null>,
 *   facingMode:    string,
 *   setFacingMode: (mode: string) => void,
 *   setShot:       (shot: object) => void,
 *   setPhase:      (phase: string) => void,
 *   onCaptureDown: () => void,
 *   onCaptureUp:   () => void,
 * }} props
 */
export default function CameraPreviewIOS({
  streamRef,
  videoRef,
  facingMode,
  setShot,
  setPhase,
}) {
  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      try { track.stop(); } catch { /* noop */ }
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [streamRef, videoRef]);

  const {
    flashOn,
    torchSupported,
    toggleFlash,
    zoom,
    zoomCaps,
    zoomLevels,
    cycleZoom,
    syncTrackCapabilities,
  } = useCameraCapture({ streamRef, videoRef, setShot, setPhase, facingMode });

  const acquireStream = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia(buildConstraints(facingMode));
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch { /* safe to ignore */ }
      }
      syncTrackCapabilities(stream);
    } catch (err) {
      console.warn("[camera-preview-ios] getUserMedia failed:", err);
      SonnerWarning("Không truy cập được camera. Hãy cấp quyền hoặc dùng nút thư viện.");
    }
  }, [facingMode, stopStream, streamRef, videoRef, syncTrackCapabilities]);

  // Re-acquire when facingMode changes; tear down on unmount.
  useEffect(() => {
    acquireStream();
    return () => stopStream();
  }, [acquireStream, stopStream]);

  // Re-acquire when tab regains visibility (browsers freeze tracks in background).
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVisibility = () => {
      if (document.visibilityState === "visible") acquireStream();
      else stopStream();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [acquireStream, stopStream]);

  return (
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

      {/* Zoom selector — top-right; only visible when track reports usable zoom range. */}
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
  );
}
