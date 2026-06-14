// frame-crop-modal.jsx
// Full-screen modal shown after the user picks a non-square PNG frame.
// Lets the user adjust a 1:1 crop before the PNG is validated and uploaded.
// Transparent areas are preserved: toBlob uses "image/png" with no fill.
//
// Props:
//   file      - the File object selected by the user (shown in the Cropper)
//   onConfirm - called with the cropped Blob (PNG, ~512²)
//   onCancel  - called when the user dismisses without confirming

import { useEffect, useMemo, useRef } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { X as CloseIcon } from "lucide-react";

export default function FrameCropModal({ file, onConfirm, onCancel }) {
  const cropperRef = useRef(null);

  // Create an object URL for the file and revoke it on unmount / file change.
  // useMemo so the URL is stable across re-renders while the file doesn't change.
  const imageSrc = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  function handleConfirm() {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    // Export as PNG so transparency (frame's transparent center) is preserved.
    // Do NOT pass a fillColor — leaving it absent keeps the canvas background
    // transparent, which means the PNG retains alpha in the cropped area.
    const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
    canvas.toBlob(
      (blob) => { if (blob) onConfirm(blob); },
      "image/png",
    );
  }

  if (!file || !imageSrc) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.95)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0, height: 52, marginTop: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", paddingLeft: 16, paddingRight: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
          Cắt khung vuông
        </span>
        <button
          onClick={onCancel}
          aria-label="Hủy"
          style={{
            position: "absolute", right: 16,
            background: "none", border: "none",
            cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 6,
          }}
        >
          <CloseIcon size={22} />
        </button>
      </div>

      {/* Helper text */}
      <p style={{
        flexShrink: 0, textAlign: "center", margin: "0 16px 10px",
        fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.4,
      }}>
        Di chuyển và phóng to để chọn vùng khung vuông
      </p>

      {/* Cropper area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <Cropper
          ref={cropperRef}
          src={imageSrc}
          style={{ width: "100%", height: "100%" }}
          aspectRatio={1}
          viewMode={1}
          autoCropArea={0.9}
          background
          guides
          dragMode="move"
          responsive
        />
      </div>

      {/* Action buttons */}
      <div style={{
        flexShrink: 0, padding: "16px 24px 44px",
        display: "flex", gap: 12,
      }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: "14px 0", borderRadius: 14,
            background: "rgba(255,255,255,0.1)", border: "none",
            color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          Hủy
        </button>
        <button
          onClick={handleConfirm}
          style={{
            flex: 2, padding: "14px 0", borderRadius: 14,
            background: "#fff", border: "none",
            color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}
        >
          Dùng khung này
        </button>
      </div>
    </div>
  );
}
