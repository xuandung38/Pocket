// Shared capture hook — extracted from camera-screen.jsx so both iOS and
// Android preview components can reuse the same tap/hold/record/photo logic
// without duplicating it. Behavior is identical to the original implementation.
//
// Consumers supply refs (streamRef, videoRef) and state setters (setShot,
// setPhase). The hook returns handlers to wire to capture button events plus
// torch/zoom state derived from the active MediaStreamTrack's capabilities.

import { useCallback, useEffect, useRef, useState } from "react";
import { SonnerWarning } from "../ui/sonner-toast";

// Press-and-hold threshold before a tap escalates into a video recording.
const VIDEO_HOLD_MS = 350;
// Cap recordings so a stuck pointer-up never queues a multi-minute upload.
const MAX_VIDEO_MS = 10_000;

// Ordered mime fallback chain — the first entry the browser supports is used.
// mp4/H.264 is listed first because iOS Safari can RECORD it but CANNOT play
// back WebM in a <video> tag — recording WebM there makes the local capture
// preview render black. Desktop Chrome rejects mp4 here and falls through to
// WebM, which it plays fine.
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

/**
 * @param {{
 *   streamRef: React.RefObject<MediaStream|null>,
 *   videoRef:  React.RefObject<HTMLVideoElement|null>,
 *   setShot:   (shot: {file: File, url: string, type: string}) => void,
 *   setPhase:  (phase: string) => void,
 *   facingMode: string,
 * }} params
 */
export function useCameraCapture({ streamRef, videoRef, setShot, setPhase, facingMode }) {
  // ── torch + zoom state ──────────────────────────────────────────────────
  const [flashOn, setFlashOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoomCaps, setZoomCaps] = useState(null); // { min, max, step } | null
  const [zoom, setZoom] = useState(1);
  const [isRecording, setIsRecording] = useState(false);

  // ── internal refs ────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const holdTimerRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  // ── sync torch/zoom from track whenever the stream changes ───────────────
  // Callers should call this when they get a new stream (e.g. after acquireStream).
  const syncTrackCapabilities = useCallback((stream) => {
    const track = stream?.getVideoTracks?.()[0];
    const caps = track?.getCapabilities?.() ?? {};
    setTorchSupported(!!caps.torch);
    setFlashOn(false);
    if (caps.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > (caps.zoom.min ?? 1)) {
      setZoomCaps({ min: caps.zoom.min ?? 1, max: caps.zoom.max, step: caps.zoom.step ?? 0.1 });
      setZoom(caps.zoom.min ?? 1);
    } else {
      setZoomCaps(null);
      setZoom(1);
    }
  }, []);

  // ── torch toggle ─────────────────────────────────────────────────────────
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
      console.warn("[use-camera-capture] torch failed:", err);
      SonnerWarning("Không bật được đèn flash.");
    }
  }, [flashOn, torchSupported, streamRef]);

  // ── zoom ──────────────────────────────────────────────────────────────────
  const zoomLevels = zoomCaps
    ? [1, 2, 3, 5].filter((z) => z >= (zoomCaps.min ?? 1) && z <= zoomCaps.max)
    : [];

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
      console.warn("[use-camera-capture] zoom failed:", err);
    }
  }, [zoom, zoomCaps, zoomLevels, streamRef]);

  // ── photo capture ─────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror selfie so the captured image matches what the user saw.
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setShot({ file, url, type: "image" });
        setPhase("captured");
      },
      "image/jpeg",
      0.85,
    );
  }, [facingMode, videoRef, setShot, setPhase]);

  // ── video recording ───────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      recorder.stop();
    } catch {
      /* recorder may already be stopping */
    }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return;

    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m));

    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      console.warn("[use-camera-capture] MediaRecorder init failed:", err);
      SonnerWarning("Trình duyệt không hỗ trợ quay video.");
      return;
    }

    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      setIsRecording(false);
      const blob = new Blob(recordedChunksRef.current, {
        type: mimeType?.startsWith("video/mp4") ? "video/mp4" : "video/webm",
      });
      recordedChunksRef.current = [];
      if (!blob.size) return;
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `capture_${Date.now()}.${ext}`, { type: blob.type });
      const url = URL.createObjectURL(blob);
      setShot({ file, url, type: "video" });
      setPhase("captured");
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);

    // Hard cap — stops recording even if the user never releases the button.
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_VIDEO_MS);
  }, [streamRef, stopRecording, setShot, setPhase]);

  // ── pointer handlers (wired to capture button) ────────────────────────────
  const handleCaptureDown = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      startRecording();
    }, VIDEO_HOLD_MS);
  }, [startRecording]);

  const handleCaptureUp = useCallback(() => {
    if (holdTimerRef.current) {
      // Released before hold threshold → photo.
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      capturePhoto();
      return;
    }
    // Released after hold threshold → end video.
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    stopRecording();
  }, [capturePhoto, stopRecording]);

  // ── cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      stopRecording();
    };
  }, [stopRecording]);

  return {
    // Capture actions
    capturePhoto,
    startRecording,
    stopRecording,
    handleCaptureDown,
    handleCaptureUp,
    isRecording,
    // Torch
    flashOn,
    torchSupported,
    toggleFlash,
    // Zoom
    zoom,
    zoomCaps,
    zoomLevels,
    cycleZoom,
    // Called by the preview component after acquiring a new stream
    syncTrackCapabilities,
  };
}
