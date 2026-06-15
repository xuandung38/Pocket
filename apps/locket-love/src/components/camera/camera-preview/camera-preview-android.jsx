// Android camera preview — deviceId selection + pinch-to-zoom + zoom labels.
// Pinch logic lives in use-android-pinch-zoom.js.
// Zoom label helpers live in android-zoom-label-utils.js.
import { useCallback, useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { SonnerWarning } from "../../ui/sonner-toast";
import { useCameraCapture } from "../use-camera-capture.js";
import { useAndroidPinchZoom } from "../use-android-pinch-zoom.js";
import { getZoomLabels, labelToZoomValue } from "../android-zoom-label-utils.js";
import { getAvailableCameras } from "../../../utils/get-available-cameras.js";

function buildConstraints(deviceId, facingMode) {
  return {
    audio: true,
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode }),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
    },
  };
}

export default function CameraPreviewAndroid({
  streamRef,
  videoRef,
  facingMode,
  setShot,
  setPhase,
  // deviceId + setDeviceId are lifted to camera-screen so the flip toggle and
  // the preview both see the same value — prevents stale-deviceId on flip after
  // a zoom lens-switch.
  deviceId,
  setDeviceId,
}) {
  const [zoomLabel, setZoomLabel] = useState("1x");
  const [zoomLabels, setZoomLabels] = useState(["1x"]);
  const [zoomDisplay, setZoomDisplay] = useState("1x");
  const currentZoomValue = useRef(1);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      try { track.stop(); } catch { /* noop */ }
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [streamRef, videoRef]);

  const { flashOn, torchSupported, toggleFlash, syncTrackCapabilities } =
    useCameraCapture({ streamRef, videoRef, setShot, setPhase, facingMode });

  // Sync zoom labels from newly acquired track capabilities.
  const syncZoom = useCallback((stream) => {
    const track = stream?.getVideoTracks?.()[0];
    const caps = track?.getCapabilities?.() ?? {};
    const labels = getZoomLabels(caps.zoom);
    setZoomLabels(labels);
    const nextLabel = labels.includes(zoomLabel) ? zoomLabel : "1x";
    setZoomLabel(nextLabel);
    const val = labelToZoomValue(nextLabel, caps.zoom);
    currentZoomValue.current = val;
    setZoomDisplay(`${Number(val.toFixed(1))}x`);
  }, [zoomLabel]);

  const acquireStream = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      stopStream();
      let targetId = deviceId;
      if (!targetId && facingMode === "environment") {
        try {
          const cams = await getAvailableCameras();
          targetId = cams.backNormalCamera?.deviceId ?? null;
        } catch { /* fall through to facingMode */ }
      }
      const stream = await navigator.mediaDevices.getUserMedia(
        buildConstraints(targetId, facingMode),
      );
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch { /* safe */ }
      }
      syncTrackCapabilities(stream);
      syncZoom(stream);
    } catch (err) {
      console.warn("[camera-preview-android] getUserMedia failed:", err);
      SonnerWarning("Không truy cập được camera. Hãy cấp quyền hoặc dùng nút thư viện.");
    }
  }, [facingMode, deviceId, stopStream, streamRef, videoRef, syncTrackCapabilities, syncZoom]);

  useEffect(() => {
    acquireStream();
    return () => stopStream();
  }, [acquireStream, stopStream]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVisibility = () => {
      if (document.visibilityState === "visible") acquireStream();
      else stopStream();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [acquireStream, stopStream]);

  // Apply a raw numeric zoom value to the active track and update display.
  const applyZoomValue = useCallback(async (value) => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    const caps = track?.getCapabilities?.() ?? {};
    if (!track || !caps.zoom) return;
    const clamped = Math.max(caps.zoom.min ?? 1, Math.min(value, caps.zoom.max ?? 1));
    await track.applyConstraints({ advanced: [{ zoom: clamped }] });
    currentZoomValue.current = clamped;
    setZoomDisplay(`${Number(clamped.toFixed(1))}x`);
    const nearest = getZoomLabels(caps.zoom).reduce((best, l) => {
      const bDist = Math.abs(labelToZoomValue(best, caps.zoom) - clamped);
      const nDist = Math.abs(labelToZoomValue(l, caps.zoom) - clamped);
      return nDist < bDist ? l : best;
    });
    setZoomLabel(nearest);
  }, [streamRef]);

  // Cycle through zoom presets; fall back to deviceId lens-switch when the
  // track has no applyConstraints zoom support.
  const cycleZoomLabel = useCallback(async () => {
    const idx = zoomLabels.indexOf(zoomLabel);
    const next = zoomLabels[(idx + 1) % zoomLabels.length];
    setZoomLabel(next);
    const track = streamRef.current?.getVideoTracks?.()[0];
    const caps = track?.getCapabilities?.() ?? {};
    if (caps.zoom) {
      await applyZoomValue(labelToZoomValue(next, caps.zoom));
      return;
    }
    try {
      const cams = await getAvailableCameras();
      const isBack = facingMode === "environment";
      let nextDeviceId = null;
      if (isBack) {
        if (next === "0.5x") nextDeviceId = cams.backUltraWideCamera?.deviceId;
        else if (next === "2x" || next === "3x") nextDeviceId = cams.backZoomCamera?.deviceId;
        else nextDeviceId = cams.backNormalCamera?.deviceId;
      } else {
        nextDeviceId = cams.frontCameras?.[0]?.deviceId ?? null;
      }
      if (nextDeviceId) setDeviceId(nextDeviceId);
    } catch (err) {
      console.warn("[camera-preview-android] lens switch failed:", err);
    }
  }, [zoomLabel, zoomLabels, facingMode, streamRef, applyZoomValue]);

  const { handleTouchStart, handleTouchMove, handleTouchEnd } =
    useAndroidPinchZoom({ streamRef, currentZoomValue, onZoomValue: applyZoomValue });

  return (
    <div
      style={{ position: "absolute", inset: 0 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
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
      <button
        onClick={toggleFlash}
        aria-label={flashOn ? "Tắt đèn flash" : "Bật đèn flash"}
        aria-pressed={flashOn}
        style={{
          position: "absolute", top: 12, left: 12,
          width: 32, height: 32, borderRadius: "50%", border: "none",
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: flashOn ? "var(--accent-yellow)" : "#fff",
        }}
      >
        <Zap size={16} fill={flashOn ? "currentColor" : "none"} />
      </button>
      <button
        onClick={cycleZoomLabel}
        aria-label={`Thu phóng ${zoomDisplay}`}
        data-testid="android-zoom-label"
        style={{
          position: "absolute", top: 12, right: 12,
          minWidth: 40, height: 32, padding: "0 8px", borderRadius: 999,
          border: "none", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700,
        }}
      >
        {zoomDisplay}
      </button>
    </div>
  );
}
