import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { CameraOff } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

const CameraPreview = forwardRef(function CameraPreview(
  { active = true, facingMode = "user", className },
  ref,
) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);
  const [error, setError] = useState(null);

  useImperativeHandle(
    ref,
    () => ({
      get video() {
        return videoRef.current;
      },
      get stream() {
        return streamRef.current;
      },
    }),
    [],
  );

  // Stop any active stream + clear video sink. Safe to call repeatedly.
  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize camera stream. Guarded against duplicate calls + late-arrival
  // streams after the effect has been cancelled (facingMode change / unmount).
  const start = useCallback(async () => {
    if (streamRef.current) return; // already running

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Trình duyệt không hỗ trợ camera.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });

      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        setError("Bạn chưa cho phép truy cập camera.");
      } else if (err?.name === "NotFoundError") {
        setError("Không tìm thấy camera.");
      } else {
        setError("Không khởi tạo được camera.");
      }
    }
  }, [facingMode]);

  useEffect(() => {
    if (!active) return undefined;

    cancelledRef.current = false;
    start();

    return () => {
      cancelledRef.current = true;
      stop();
    };
  }, [active, facingMode, start, stop]);

  // Browsers may release camera tracks when the tab is backgrounded.
  // On return-to-foreground, ensure we re-acquire the stream so the
  // preview doesn't stay black until facingMode toggles.
  useEffect(() => {
    if (!active) return undefined;

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      // Drop any orphan track that browser silently stopped, then re-init.
      const tracks = streamRef.current?.getTracks?.() ?? [];
      const allEnded = tracks.length > 0 && tracks.every((t) => t.readyState === "ended");
      if (!streamRef.current || allEnded) {
        stop();
        setError(null);
        start();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active, start, stop]);

  if (error) {
    return (
      <div
        className={clsx(
          "absolute inset-0 flex items-center justify-center bg-base-200",
          className,
        )}
      >
        <EmptyState
          icon={CameraOff}
          title="Camera access denied"
          subtitle={error}
        />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={clsx(
        "absolute inset-0 w-full h-full object-cover",
        facingMode === "user" && "scale-x-[-1]",
        className,
      )}
    />
  );
});

export default CameraPreview;
