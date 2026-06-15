// iOS camera flip — toggles facingMode between user/environment.
// Safari's facingMode API is reliable on iOS; no deviceId needed.
import { useState } from "react";
import { RotateCcw } from "lucide-react";

/**
 * @param {{
 *   facingMode:    string,
 *   setFacingMode: (mode: string) => void,
 * }} props
 */
export default function CameraToggleIOS({ facingMode, setFacingMode }) {
  const [rotation, setRotation] = useState(0);

  const handleFlip = () => {
    setRotation((r) => r - 180);
    setFacingMode(facingMode === "user" ? "environment" : "user");
  };

  return (
    <button
      onClick={handleFlip}
      aria-label="Đổi camera"
      data-testid="camera-toggle-ios"
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
