// Android camera flip — uses getAvailableCameras() to select the correct
// physical lens by deviceId when switching front/back, so Android's
// multi-camera system picks the right sensor instead of an arbitrary one.
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { getAvailableCameras } from "../../../utils/get-available-cameras.js";

/**
 * @param {{
 *   facingMode:    string,
 *   setFacingMode: (mode: string) => void,
 *   streamRef:     React.RefObject<MediaStream|null>,
 *   videoRef:      React.RefObject<HTMLVideoElement|null>,
 *   onDeviceId?:   (id: string|null) => void,
 * }} props
 */
export default function CameraToggleAndroid({
  facingMode,
  setFacingMode,
  streamRef,
  videoRef,
  onDeviceId,
}) {
  const [rotation, setRotation] = useState(0);

  const handleFlip = async () => {
    setRotation((r) => r - 180);
    const newMode = facingMode === "user" ? "environment" : "user";

    let nextDeviceId = null;
    try {
      const cams = await getAvailableCameras();
      // Identify the current track's deviceId so we pick a *different* one.
      const currentTrack = streamRef.current?.getVideoTracks?.()?.[0] ?? null;
      const currentId = currentTrack?.getSettings?.()?.deviceId;
      const fallback = cams.allCameras?.find((d) => d.deviceId !== currentId);

      nextDeviceId =
        newMode === "environment"
          ? cams.backNormalCamera?.deviceId ??
            cams.backCameras?.[0]?.deviceId ??
            fallback?.deviceId ??
            null
          : cams.frontCameras?.[0]?.deviceId ?? fallback?.deviceId ?? null;
    } catch (err) {
      console.warn("[camera-toggle-android] getAvailableCameras failed:", err);
    }

    // Stop the current stream before switching so the OS camera indicator
    // turns off between the two acquisitions.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    setFacingMode(newMode);
    // Propagate the resolved deviceId upward so the preview component
    // can use it on next acquireStream (Android path prefers deviceId).
    onDeviceId?.(nextDeviceId);
  };

  return (
    <button
      onClick={handleFlip}
      aria-label="Đổi camera"
      data-testid="camera-toggle-android"
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
      <RotateCcw
        size={28}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 0.5s",
        }}
      />
    </button>
  );
}
