// frame-section.jsx
// Photo-frame chooser rendered INLINE as the "VIP" section of the caption
// picker sheet (previously a standalone FramePicker bottom sheet). Shows:
// None → built-in frames → custom user frames → upload. Non-square PNG uploads
// open FrameCropModal (z-300, sits above the sheet) for a 1:1 crop first.
//
// Props: { selectedFrameId, onSelect(frame|null) }. The host closes the sheet
// after a pick.

import { useRef, useState } from "react";
import { Loader2, X as CloseIcon } from "lucide-react";
import FrameCropModal from "../frame-crop-modal";
import { SonnerError, SonnerSuccess } from "../ui/sonner-toast";
import { useFrameStore } from "@/stores";

// Neutral soft-gray gradient behind PNG frames — a calm "photo" stand-in that
// shows light + pastel frame decorations without an overpowering color wall.
const SAMPLE_BG = "linear-gradient(135deg, #d2d6dc 0%, #b6bcc6 100%)";

// Read a File's pixel dimensions without extra libraries.
async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cannot read image dimensions"));
    };
    img.src = url;
  });
}

function FrameThumb({ frame, isSelected, onClick, onDelete, isDeleting }) {
  const borderColor = isSelected ? "#fff" : "rgba(255,255,255,0.2)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", flexShrink: 0 }}>
      <button
        onClick={onClick}
        style={{
          width: 64, height: 64, borderRadius: 12, overflow: "hidden",
          border: `2.5px solid ${borderColor}`,
          background: frame.type === "png" ? SAMPLE_BG : (frame.type === "polaroid" ? "#f0f0f0" : "#1a1a1a"),
          cursor: "pointer", padding: 0,
          outline: isSelected ? "2px solid rgba(255,255,255,0.35)" : "none",
          outlineOffset: 2,
          display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        }}
      >
        {frame.type === "png" && (
          <img
            src={frame.url}
            alt={frame.name}
            crossOrigin="anonymous"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
          />
        )}
        {frame.type === "polaroid" && (
          <div
            style={{
              width: "100%", height: "100%", background: "#fff", boxSizing: "border-box",
              borderTop: "5px solid #e0e0e0", borderLeft: "5px solid #e0e0e0",
              borderRight: "5px solid #e0e0e0", borderBottom: "16px solid #e0e0e0",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div style={{ width: 30, height: 22, borderRadius: 2, background: SAMPLE_BG }} />
          </div>
        )}
      </button>

      {frame.scope === "user" && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isDeleting}
          aria-label="Xóa khung"
          style={{
            position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
            background: "#e53e3e", border: "2px solid #000",
            cursor: isDeleting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0, zIndex: 2,
          }}
        >
          {isDeleting
            ? <Loader2 size={9} style={{ animation: "spin 1s linear infinite", color: "#fff" }} />
            : <CloseIcon size={9} color="#fff" />}
        </button>
      )}

      <span style={{ fontSize: 10, color: "var(--text-secondary)", maxWidth: 64, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {frame.name}
      </span>
    </div>
  );
}

export default function FrameSection({ selectedFrameId, onSelect }) {
  const { frames, isLoading, addCustomFrame, removeFrame } = useFrameStore();
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingCropFile, setPendingCropFile] = useState(null);
  const fileInputRef = useRef(null);

  async function uploadFrame(file) {
    setIsUploading(true);
    try {
      await addCustomFrame(file);
      SonnerSuccess("Đã thêm khung", "Khung tùy chỉnh đã được tải lên.");
    } catch (err) {
      SonnerError("Tải khung thất bại", err?.message || "Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") {
      SonnerError("Tải khung thất bại", "Chỉ chấp nhận file PNG.");
      return;
    }
    try {
      const { w, h } = await getImageDimensions(file);
      if (w !== h) {
        setPendingCropFile(file);
        return;
      }
    } catch {
      /* fall through — validateFramePng handles bad files */
    }
    await uploadFrame(file);
  }

  async function handleCropConfirm(croppedBlob) {
    const originalName = pendingCropFile?.name || `frame_${Date.now()}.png`;
    setPendingCropFile(null);
    await uploadFrame(new File([croppedBlob], originalName, { type: "image/png" }));
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await removeFrame(id);
    } catch (err) {
      SonnerError("Xóa khung thất bại", err?.message || "Vui lòng thử lại.");
    } finally {
      setDeletingId(null);
    }
  }

  const noneSelected = !selectedFrameId;

  return (
    <section style={{ marginBottom: 20 }}>
      {/* VIP label — standout gradient pill so the frame row reads as premium */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: "#1a1200",
            padding: "3px 10px", borderRadius: 999,
            background: "linear-gradient(90deg,#ffe16b,#f5a623)",
            boxShadow: "0 0 12px rgba(245,166,35,0.45)",
          }}
        >
          ★ VIP
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Khung ảnh</span>
      </div>

      <div
        style={{
          display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-start",
          maxHeight: "32vh", overflowY: "auto", paddingBottom: 4,
        }}
      >
        {/* None */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => onSelect(null)}
            style={{
              width: 64, height: 64, borderRadius: 12, flexShrink: 0,
              border: `2.5px solid ${noneSelected ? "#fff" : "rgba(255,255,255,0.2)"}`,
              background: "rgba(255,255,255,0.06)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: "rgba(255,255,255,0.55)",
              outline: noneSelected ? "2px solid rgba(255,255,255,0.35)" : "none", outlineOffset: 2,
            }}
          >
            ✕
          </button>
          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Không</span>
        </div>

        {isLoading && frames.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", paddingLeft: 8, color: "var(--text-secondary)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {frames.map((frame) => (
          <FrameThumb
            key={frame.id}
            frame={frame}
            isSelected={selectedFrameId === frame.id}
            onClick={() => onSelect(frame)}
            onDelete={() => handleDelete(frame.id)}
            isDeleting={deletingId === frame.id}
          />
        ))}

        {/* Upload */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label="Tải khung ảnh PNG"
            style={{
              width: 64, height: 64, borderRadius: 12,
              border: "2px dashed rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)",
              cursor: isUploading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.55)", fontSize: 28,
            }}
          >
            {isUploading ? <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /> : "+"}
          </button>
          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Tải khung</span>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/png" onChange={handleFileChange} style={{ display: "none" }} />

      {pendingCropFile && (
        <FrameCropModal
          file={pendingCropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setPendingCropFile(null)}
        />
      )}
    </section>
  );
}
