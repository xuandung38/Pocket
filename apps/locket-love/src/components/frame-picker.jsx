// frame-picker.jsx
// Self-contained bottom sheet for choosing a photo frame.
// Displays: None option → built-in frames → custom user frames → upload button.
// Props: { open, onClose, selectedFrameId, onSelect(frame|null) }

import { useEffect, useRef, useState } from "react";
import { Loader2, X as CloseIcon } from "lucide-react";
import BottomSheet from "./sheets/bottom-sheet";
import { SonnerError, SonnerSuccess } from "./ui/sonner-toast";
import { useFrameStore } from "@/stores";

// -------------------------------------------------------------------
// FrameThumb — single selectable thumbnail inside the picker row.
// -------------------------------------------------------------------
function FrameThumb({ frame, isSelected, onClick, onDelete, isDeleting }) {
  const borderColor = isSelected ? "#fff" : "rgba(255,255,255,0.2)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", flexShrink: 0 }}>
      {/* Thumbnail button */}
      <button
        onClick={onClick}
        style={{
          width: 64, height: 64, borderRadius: 12, overflow: "hidden",
          border: `2.5px solid ${borderColor}`,
          background: frame.type === "polaroid" ? "#f0f0f0" : "#1a1a1a",
          cursor: "pointer", padding: 0,
          outline: isSelected ? "2px solid rgba(255,255,255,0.35)" : "none",
          outlineOffset: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {frame.type === "png" && (
          <img
            src={frame.url}
            alt={frame.name}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
        {frame.type === "polaroid" && (
          // Mini polaroid mockup in the thumbnail
          <div style={{
            width: "100%", height: "100%", background: "#fff", boxSizing: "border-box",
            borderTop: "5px solid #e0e0e0", borderLeft: "5px solid #e0e0e0",
            borderRight: "5px solid #e0e0e0", borderBottom: "16px solid #e0e0e0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 30, height: 22, background: "#b8cfe8", borderRadius: 2 }} />
          </div>
        )}
      </button>

      {/* Delete affordance for custom (user-owned) frames */}
      {frame.scope === "user" && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isDeleting}
          aria-label="Xóa khung"
          style={{
            position: "absolute", top: -6, right: -6,
            width: 20, height: 20, borderRadius: "50%",
            background: "#e53e3e", border: "2px solid #000",
            cursor: isDeleting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, zIndex: 2,
          }}
        >
          {isDeleting
            ? <Loader2 size={9} style={{ animation: "spin 1s linear infinite", color: "#fff" }} />
            : <CloseIcon size={9} color="#fff" />}
        </button>
      )}

      <span style={{
        fontSize: 10, color: "var(--text-secondary)", maxWidth: 64,
        textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {frame.name}
      </span>
    </div>
  );
}

// -------------------------------------------------------------------
// FramePicker — main export, wraps its own BottomSheet.
// -------------------------------------------------------------------
export default function FramePicker({ open, onClose, selectedFrameId, onSelect }) {
  const { frames, isLoading, fetchFrames, addCustomFrame, removeFrame } = useFrameStore();
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  // Pre-warm the frame library on mount.
  useEffect(() => { fetchFrames(); }, [fetchFrames]);

  function handleSelect(frame) {
    onSelect(frame);
    onClose();
  }

  function handleNone() {
    onSelect(null);
    onClose();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same file can be re-picked after an error
    if (!file) return;
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
    <BottomSheet open={open} onClose={onClose} title="Khung ảnh">
      <div style={{ padding: "12px 16px 32px" }}>
        {/* Horizontally scrollable thumbnail row */}
        <div
          style={{
            display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8,
            // Hide scrollbar visually but keep functionality
            scrollbarWidth: "none", msOverflowStyle: "none",
          }}
        >
          {/* None option — removes any active frame */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={handleNone}
              style={{
                width: 64, height: 64, borderRadius: 12, flexShrink: 0,
                border: `2.5px solid ${noneSelected ? "#fff" : "rgba(255,255,255,0.2)"}`,
                background: "rgba(255,255,255,0.06)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: "rgba(255,255,255,0.55)",
                outline: noneSelected ? "2px solid rgba(255,255,255,0.35)" : "none",
                outlineOffset: 2,
              }}
            >
              ✕
            </button>
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Không</span>
          </div>

          {/* Loading indicator (first load only) */}
          {isLoading && frames.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", paddingLeft: 8, color: "var(--text-secondary)" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          )}

          {/* Frame thumbnails — built-in first (order asc), then user custom */}
          {frames.map((frame) => (
            <FrameThumb
              key={frame.id}
              frame={frame}
              isSelected={selectedFrameId === frame.id}
              onClick={() => handleSelect(frame)}
              onDelete={() => handleDelete(frame.id)}
              isDeleting={deletingId === frame.id}
            />
          ))}

          {/* Upload custom frame */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label="Tải khung ảnh PNG"
              style={{
                width: 64, height: 64, borderRadius: 12,
                border: "2px dashed rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.05)",
                cursor: isUploading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.55)", fontSize: 28,
              }}
            >
              {isUploading
                ? <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
                : "+"}
            </button>
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Tải khung</span>
          </div>
        </div>

        {frames.length === 0 && !isLoading && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginTop: 12 }}>
            Chưa có khung nào. Tải khung PNG của bạn lên.
          </p>
        )}
      </div>

      {/* Hidden file input — accept PNG only */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </BottomSheet>
  );
}
