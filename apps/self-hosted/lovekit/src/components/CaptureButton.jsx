import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { SonnerInfo } from "@/components/ui/SonnerToast";

const HOLD_THRESHOLD_MS = 500;
const MAX_RECORD_MS = 10_000;
const OUTPUT_SIZE = 1080;

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) return "video/webm;codecs=vp9";
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
  return "";
};

const drawSquareFrame = (ctx, video, mirror) => {
  const side = Math.min(video.videoWidth, video.videoHeight);
  if (!side) return;
  const sx = (video.videoWidth - side) / 2;
  const sy = (video.videoHeight - side) / 2;

  ctx.save();
  if (mirror) {
    ctx.translate(OUTPUT_SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.restore();
};

export default function CaptureButton({ getVideo, mirror = true, onCapture, disabled = false }) {
  const [isHolding, setIsHolding] = useState(false);

  const holdStartRef = useRef(null);
  const holdTimerRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingRef = useRef(false);
  const intentRecordRef = useRef(false);
  const stopTimerRef = useRef(null);
  const animFrameRef = useRef(null);

  const stopAll = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAll();
      if (recorderRef.current && recorderRef.current.state === "recording") {
        try { recorderRef.current.stop(); } catch { /* noop */ }
      }
    };
  }, []);

  const captureImage = () => {
    const video = getVideo?.();
    if (!video || video.readyState < 2) {
      SonnerInfo("Camera chưa sẵn sàng, vui lòng chờ giây lát.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    drawSquareFrame(ctx, video, mirror);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          SonnerInfo("Không tạo được ảnh, vui lòng thử lại.");
          return;
        }
        const file = new File([blob], `lovekit-${Date.now()}.jpg`, { type: "image/jpeg" });
        const url = URL.createObjectURL(file);
        onCapture?.({ type: "image", file, url });
      },
      "image/jpeg",
      0.92,
    );
  };

  const startRecording = () => {
    const video = getVideo?.();
    if (!video || video.readyState < 2) {
      SonnerInfo("Camera chưa sẵn sàng, vui lòng chờ giây lát.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      SonnerInfo("Thiết bị không hỗ trợ ghi video.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);

    const mimeType = pickMimeType();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      SonnerInfo("Không khởi tạo được trình ghi video.");
      return;
    }
    recorderRef.current = recorder;
    recordingRef.current = true;

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      recordingRef.current = false;
      setIsHolding(false);
      stream.getTracks().forEach((t) => t.stop());
      if (!chunks.length) {
        SonnerInfo("Không ghi được video, vui lòng thử lại.");
        return;
      }
      const finalType = mimeType || "video/mp4";
      const ext = finalType.includes("webm") ? "webm" : "mp4";
      const blob = new Blob(chunks, { type: finalType });
      const file = new File([blob], `lovekit-${Date.now()}.${ext}`, { type: finalType });
      const url = URL.createObjectURL(file);
      onCapture?.({ type: "video", file, url });
    };

    try {
      recorder.start();
    } catch {
      recordingRef.current = false;
      setIsHolding(false);
      SonnerInfo("Không bắt đầu được ghi video.");
      return;
    }
    setIsHolding(true);

    const drawLoop = () => {
      if (!recordingRef.current) return;
      drawSquareFrame(ctx, video, mirror);
      animFrameRef.current = requestAnimationFrame(drawLoop);
    };
    animFrameRef.current = requestAnimationFrame(drawLoop);

    stopTimerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, MAX_RECORD_MS);
  };

  const handleStart = (e) => {
    if (disabled) return;
    e.preventDefault();
    intentRecordRef.current = true;
    holdStartRef.current = Date.now();
    holdTimerRef.current = setTimeout(() => {
      if (intentRecordRef.current) startRecording();
    }, HOLD_THRESHOLD_MS);
  };

  const handleEnd = (e) => {
    if (disabled) return;
    e.preventDefault();
    intentRecordRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (recordingRef.current && recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }

    const held = Date.now() - (holdStartRef.current || Date.now());
    if (held < HOLD_THRESHOLD_MS) captureImage();
  };

  return (
    <button
      type="button"
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      aria-label="Chụp ảnh — giữ để quay video"
      className={clsx(
        "relative flex items-center justify-center w-20 h-20",
        "rounded-full active:scale-95 transition-transform",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
      style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
    >
      <span
        className={clsx(
          "absolute inset-0 rounded-full border-[3px] border-white/90 transition-transform",
          isHolding && "animate-pulse scale-110 border-primary",
        )}
      />
      <span
        className={clsx(
          "rounded-full bg-white transition-all",
          isHolding ? "w-10 h-10 bg-primary" : "w-16 h-16",
        )}
      />
    </button>
  );
}
