import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import clsx from "clsx";
import { CameraOff } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

const CameraPreview = forwardRef(function CameraPreview(
  { active = true, facingMode = "user", className },
  ref,
) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
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

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Trình duyệt không hỗ trợ camera.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        if (cancelled) {
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
    };

    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [active, facingMode]);

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
