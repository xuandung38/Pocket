// captured-send-preview.jsx
// Full-screen "Gửi đến..." review overlay shown after capture.
// Matches the original Locket Dark send-screen design:
//   caption chip overlaid on photo (swipeable, 8 slots)
//   [X | Send | Aa+] action row
//   Tất cả + per-friend recipient row with real store data
//
// For image shots, the static <img> is replaced with a gesture-based PhotoCropper
//   (pan + pinch-zoom + twist-rotate). On Send, exportBlob(1080) produces a
//   pre-cropped square File that camera-screen uses as the base for composeFrame.

import { useState, useRef, useEffect, useMemo } from "react";
import { Download, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Avatar from "./ui/avatar";
import BottomSheet from "./sheets/bottom-sheet";
import FramePicker from "./frame-picker";
import PhotoCropper from "./photo-cropper";
import { musicServices } from "../data/mock-data";
import { useOverlayStore, useFrameStore } from "@/stores";

// Convert API theme object → internal { id, icon, label, bg, text } shape
function normalizeTheme(t) {
  const colorTop = t.color_top || t.top || "#2c2c2e";
  const colorBot = t.color_bottom || t.color_bot || colorTop;
  const bg = colorTop !== colorBot
    ? `linear-gradient(to bottom, ${colorTop}, ${colorBot})`
    : colorTop;
  return {
    id: t.preset_id || t.id || t.caption || String(t.order_index ?? Math.random()),
    icon: t.icon || "",
    label: t.caption || t.preset_caption || "",
    bg,
    text: t.text_color || t.color_text || "#fff",
  };
}

const SWIPE_THRESHOLD = 40;

function PaperPlaneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CapturedSendPreview({ shot, friends = [], isPosting, onPost, onCancel }) {
  const [captionIndex, setCaptionIndex] = useState(0);
  const [customMessage, setCustomMessage] = useState("");
  const [aaText, setAaText] = useState("");
  const [editingMessage, setEditingMessage] = useState(false);
  const [sheetCaption, setSheetCaption] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState(["all"]);
  // selectedFrame: null = no frame; frame object from useFrameStore.frames otherwise.
  const [selectedFrame, setSelectedFrame] = useState(null);
  const dragStartX = useRef(null);

  // Ref forwarded into PhotoCropper; used in handleSend to extract the 1080² crop.
  const cropperRef = useRef(null);

  const { captionOverlays, fetchCaptionOverlays } = useOverlayStore();
  useEffect(() => { fetchCaptionOverlays(); }, [fetchCaptionOverlays]);

  // Pre-warm the frame library so the picker opens instantly.
  const { fetchFrames } = useFrameStore();
  useEffect(() => { fetchFrames(); }, [fetchFrames]);

  // Carousel slots: slot 0 = message bubble, slots 1..N = API themes (max 7)
  const quickCaptions = useMemo(() => {
    const apiSlots = [...captionOverlays.custome, ...captionOverlays.decorative]
      .slice(0, 7)
      .map(normalizeTheme);
    return [null, ...apiSlots];
  }, [captionOverlays]);

  function toggleRecipient(id) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  function cycleCaption(direction) {
    setEditingMessage(false);
    setSheetCaption(null);
    setCaptionIndex(
      (prev) => (prev + direction + quickCaptions.length) % quickCaptions.length,
    );
  }

  function selectFromSheet(sticker) {
    if (sheetCaption?.id === sticker.id) {
      setSheetCaption(null);
      setEditingMessage(false);
    } else {
      setSheetCaption(sticker);
      setEditingMessage(sticker.id === "text");
    }
    setActiveSheet(null);
  }

  function handlePhotoPtrDown(e) { dragStartX.current = e.clientX; }
  function handlePhotoPtrUp(e) {
    if (dragStartX.current == null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) cycleCaption(dx < 0 ? 1 : -1);
  }

  // Derived state — declared here (above useMemo) so captionForPolaroid is
  // available inside the frameOverlayNode memo without hitting the const TDZ.
  const allSelected = selectedRecipients.includes("all");
  const isAaCaption = sheetCaption?.id === "text";
  const isMessageSlot = !sheetCaption && captionIndex === 0;
  const isEditableSlot = isAaCaption || isMessageSlot;
  const activeSticker = sheetCaption || quickCaptions[captionIndex];
  // Caption text shown in the polaroid bottom strip preview (mirrors bake output).
  const captionForPolaroid = isAaCaption ? aaText : customMessage;

  // Build the frame overlay ReactNode for the PhotoCropper (image shots only).
  // Rendered above the Cropper canvas (pointer-events:none) so users see the
  // frame while adjusting the crop — without blocking pan/zoom interactions.
  const frameOverlayNode = useMemo(() => {
    if (!selectedFrame) return null;
    if (selectedFrame.type === "png") {
      return (
        // crossOrigin mandatory — same reason as the picker thumbnail and
        // compose-frame: avoids poisoning the CORS-cached response used later
        // by the canvas bake in composeFrame.
        <img
          src={selectedFrame.url}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
          }}
        />
      );
    }
    if (selectedFrame.type === "polaroid") {
      return (
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "#fff" }} />
          <div style={{ position: "absolute", top: 12, bottom: 52, left: 0, width: 12, background: "#fff" }} />
          <div style={{ position: "absolute", top: 12, bottom: 52, right: 0, width: 12, background: "#fff" }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 52, background: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          }}>
            <div style={{ fontSize: 9, color: "#999" }}>
              {new Date().toLocaleDateString("vi-VN")}
            </div>
            {captionForPolaroid && (
              <div style={{
                fontSize: 11, fontWeight: 600, color: "#333",
                maxWidth: "80%", textAlign: "center",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {captionForPolaroid}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  }, [selectedFrame, captionForPolaroid]);

  async function handleSend() {
    const isAa = sheetCaption?.id === "text";
    const caption = isAa ? aaText : customMessage;
    const allSelected = selectedRecipients.includes("all");

    // Build frameSpec to forward to camera-screen for canvas baking.
    let frameSpec = { type: "none" };
    if (selectedFrame) {
      if (selectedFrame.type === "png") {
        frameSpec = { type: "png", url: selectedFrame.url };
      } else if (selectedFrame.type === "polaroid") {
        // Polaroid date injected at post time in camera-screen so it reflects
        // actual submission moment — not preview time.
        frameSpec = { type: "polaroid", caption };
      }
    }

    // For image shots, export the 1080² crop from the gesture cropper before
    // sending. camera-screen bakes the frame onto this pre-cropped square.
    // Falls back to null (camera-screen uses shot.file) if not available.
    let croppedPhoto = null;
    if (shot.type === "image" && cropperRef.current?.exportBlob) {
      try {
        const blob = await cropperRef.current.exportBlob(1080);
        if (blob) {
          croppedPhoto = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });
        }
      } catch (err) {
        console.warn("[captured-send-preview] exportBlob failed:", err);
        // croppedPhoto stays null; camera-screen falls back to shot.file
      }
    }

    onPost({
      caption,
      audience: allSelected ? "all" : "selected",
      recipients: allSelected ? [] : selectedRecipients,
      overlayData: sheetCaption && sheetCaption.id !== "text" ? { sticker: sheetCaption } : {},
      frame: frameSpec,
      croppedPhoto,
    });
  }

  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "#000",
        display: "flex", flexDirection: "column", zIndex: 5,
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
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
          Gửi đến...
        </span>
        <button
          className="icon-btn"
          aria-label="Lưu"
          style={{ position: "absolute", right: 16, background: "none", backdropFilter: "none" }}
        >
          <Download size={22} />
        </button>
      </div>

      {/* Photo / video preview */}
      <div style={{ flexShrink: 0, padding: "0 12px" }}>
        <div
          onPointerDown={handlePhotoPtrDown}
          onPointerUp={handlePhotoPtrUp}
          onPointerCancel={() => (dragStartX.current = null)}
          style={{
            borderRadius: 28, overflow: "hidden",
            position: "relative", paddingBottom: "100%",
            background: "#111", touchAction: "pan-y", userSelect: "none",
            // Isolate the stacking context so the frame overlay's high z-index
            // stays contained inside this square — otherwise it paints OVER the
            // frame-picker BottomSheet (z-40) when the sheet slides up.
            isolation: "isolate",
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>

            {shot.type === "image" ? (
              // Wrap in a stopPropagation div so panning inside the Cropper
              // doesn't inadvertently fire the caption-swipe gesture above.
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                style={{ position: "absolute", inset: 0 }}
              >
                <PhotoCropper
                  src={shot.url}
                  cropperRef={cropperRef}
                  frameOverlay={frameOverlayNode}
                />
              </div>
            ) : (
              // Video: no Cropper; keep frame overlays for visual preview only
              // (frames are never baked onto videos in camera-screen).
              <>
                <video
                  src={shot.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {selectedFrame?.type === "png" && (
                  <img
                    src={selectedFrame.url}
                    alt=""
                    crossOrigin="anonymous"
                    style={{
                      position: "absolute", inset: 0, width: "100%", height: "100%",
                      objectFit: "cover", pointerEvents: "none", zIndex: 1,
                    }}
                  />
                )}
                {selectedFrame?.type === "polaroid" && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "#fff" }} />
                    <div style={{ position: "absolute", top: 12, bottom: 52, left: 0, width: 12, background: "#fff" }} />
                    <div style={{ position: "absolute", top: 12, bottom: 52, right: 0, width: 12, background: "#fff" }} />
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: 52, background: "#fff",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                    }}>
                      <div style={{ fontSize: 9, color: "#999" }}>{new Date().toLocaleDateString("vi-VN")}</div>
                      {captionForPolaroid && (
                        <div style={{
                          fontSize: 11, fontWeight: 600, color: "#333",
                          maxWidth: "80%", textAlign: "center",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {captionForPolaroid}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Posting spinner — covers both Cropper and video */}
            {isPosting && (
              <div
                style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", zIndex: 10,
                }}
              >
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}

            {/* Prev arrow */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => cycleCaption(-1)}
              style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)",
                borderRadius: "50%", width: 32, height: 32, border: "none",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "rgba(255,255,255,0.85)", zIndex: 5,
              }}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Next arrow */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => cycleCaption(1)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)",
                borderRadius: "50%", width: 32, height: 32, border: "none",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "rgba(255,255,255,0.85)", zIndex: 5,
              }}
            >
              <ChevronRight size={18} />
            </button>

            {/* Caption overlay */}
            <div
              style={{
                position: "absolute", bottom: 14, left: "50%",
                transform: "translateX(-50%)", whiteSpace: "nowrap",
                maxWidth: "85%", zIndex: 5,
              }}
            >
              {isEditableSlot ? (
                (() => {
                  const placeholder = isAaCaption ? "Văn bản" : "Thêm một tin nhắn";
                  const pillBg = isAaCaption ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.45)";
                  const pillFontSize = isAaCaption ? 18 : 14;
                  const value = isAaCaption ? aaText : customMessage;
                  const setValue = isAaCaption ? setAaText : setCustomMessage;
                  const pillWeight = isAaCaption ? 700 : value ? 600 : 500;
                  if (editingMessage) {
                    return (
                      <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={() => setEditingMessage(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") setEditingMessage(false);
                        }}
                        placeholder={placeholder}
                        style={{
                          background: pillBg, backdropFilter: "blur(10px)",
                          borderRadius: 20, padding: "8px 18px",
                          fontSize: pillFontSize, color: "#fff", fontWeight: pillWeight,
                          border: "none", outline: "none", textAlign: "center", minWidth: 200,
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={() => setEditingMessage(true)}
                      style={{
                        background: pillBg, backdropFilter: "blur(10px)",
                        borderRadius: 20, padding: "8px 18px",
                        fontSize: pillFontSize, fontWeight: pillWeight,
                        color: value ? "#fff" : "rgba(255,255,255,0.7)", cursor: "text",
                      }}
                    >
                      {value || placeholder}
                    </div>
                  );
                })()
              ) : (
                <div
                  className="caption-chip"
                  style={{
                    background: activeSticker.bg || "rgba(0,0,0,0.5)",
                    color: activeSticker.text || "#fff",
                    backdropFilter: "blur(10px)",
                    fontSize: 15, fontWeight: 600, padding: "8px 18px",
                  }}
                >
                  <span>{activeSticker.icon}</span>
                  <span>{activeSticker.label}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: 10, gap: 10 }}>
        {/* Pagination dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, padding: "6px 0" }}>
          {quickCaptions.map((_, i) => {
            const active = i === captionIndex && !sheetCaption;
            return (
              <div
                key={i}
                style={{
                  width: active ? 18 : 6, height: 6, borderRadius: 3,
                  background: active ? "#fff" : "rgba(255,255,255,0.22)",
                  transition: "width 0.15s",
                }}
              />
            );
          })}
        </div>

        {/* Action bar: X | Send | Frame | Aa+ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 32px" }}>
          <button
            onClick={onCancel}
            disabled={isPosting}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)", border: "none",
              cursor: isPosting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", opacity: isPosting ? 0.5 : 1,
            }}
          >
            <X size={20} />
          </button>

          <button
            onClick={handleSend}
            disabled={isPosting}
            style={{
              width: 62, height: 62, borderRadius: "50%",
              background: "rgba(255,255,255,0.18)", border: "none",
              cursor: isPosting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isPosting
              ? <Loader2 size={22} style={{ animation: "spin 1s linear infinite", color: "#fff" }} />
              : <PaperPlaneIcon />}
          </button>

          {/* Frame picker button — highlighted when a frame is active */}
          <button
            onClick={() => !isPosting && setActiveSheet("frame")}
            disabled={isPosting}
            aria-label="Khung ảnh"
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: selectedFrame ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)",
              border: selectedFrame ? "1.5px solid rgba(255,255,255,0.45)" : "none",
              cursor: isPosting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, opacity: isPosting ? 0.5 : 1,
            }}
          >
            🖼️
          </button>

          <button
            onClick={() => !isPosting && setActiveSheet("caption")}
            disabled={isPosting}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)", border: "none",
              cursor: isPosting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 14, fontWeight: 600, gap: 1,
              opacity: isPosting ? 0.5 : 1,
            }}
          >
            Aa<sup style={{ fontSize: 9 }}>✦</sup>
          </button>
        </div>

        {/* Recipients row */}
        <div
          style={{
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            gap: 18, padding: "6px 16px 8px",
          }}
        >
          {/* Tất cả */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <button
              onClick={() => toggleRecipient("all")}
              disabled={isPosting}
              style={{
                width: 50, height: 50, borderRadius: "50%",
                background: allSelected ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.1)",
                border: `2.5px solid ${allSelected ? "var(--accent-yellow)" : "transparent"}`,
                cursor: isPosting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24"
                fill={allSelected ? "var(--accent-yellow)" : "rgba(255,255,255,0.6)"}
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: allSelected ? "var(--accent-yellow)" : "var(--text-secondary)" }}>
              Tất cả
            </span>
          </div>

          {/* Individual friends (cap at 5 to avoid overflow) */}
          {friends.slice(0, 5).map((f) => {
            const fId = f.uid;
            const isSelected = selectedRecipients.includes(fId);
            const displayName = f.firstName || f.username || "?";
            return (
              <div key={fId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <button
                  onClick={() => toggleRecipient(fId)}
                  disabled={isPosting}
                  style={{
                    width: 50, height: 50, borderRadius: "50%", padding: 0,
                    border: `2.5px solid ${isSelected ? "var(--accent-yellow)" : "rgba(255,255,255,0.2)"}`,
                    cursor: isPosting ? "not-allowed" : "pointer",
                    overflow: "hidden", background: "none",
                  }}
                >
                  <Avatar src={f.profilePic} name={displayName} size={46} />
                </button>
                <span
                  style={{
                    fontSize: 12,
                    color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                    maxWidth: 58, textAlign: "center",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {displayName.split(" ")[0]}...
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption Sheet */}
      <BottomSheet open={activeSheet === "caption"} onClose={() => setActiveSheet(null)} title="Chú thích">
        <div style={{ padding: "12px 16px 32px" }}>
          {captionOverlays.custome.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>General</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {captionOverlays.custome.map(normalizeTheme).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectFromSheet(s)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "10px 16px", borderRadius: 999,
                      border: `2px solid ${sheetCaption?.id === s.id ? "#fff" : "transparent"}`,
                      background: s.bg, color: s.text, fontSize: 14, fontWeight: 600,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    <span>{s.icon}</span><span>{s.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {captionOverlays.decorative.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>Decorative</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {captionOverlays.decorative.map(normalizeTheme).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectFromSheet(s)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "10px 16px", borderRadius: 999,
                      border: `2px solid ${sheetCaption?.id === s.id ? "#fff" : "transparent"}`,
                      background: s.bg, color: s.text, fontSize: 14, fontWeight: 600,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    <span>{s.icon}</span><span>{s.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {captionOverlays.custome.length === 0 && captionOverlays.decorative.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "24px 0", fontSize: 14 }}>
              Chưa có chú thích nào
            </div>
          )}
          <button
            className="pill-btn"
            onClick={() => setActiveSheet("music")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            🎵 Thêm nhạc
          </button>
        </div>
      </BottomSheet>

      {/* Music Sheet */}
      <BottomSheet open={activeSheet === "music"} onClose={() => setActiveSheet(null)} title="Chọn dịch vụ">
        <div style={{ padding: "8px 0 32px" }}>
          {musicServices.map((svc, idx) => (
            <div key={svc.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: svc.color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {svc.id === "spotify" ? "🎵" : "🎶"}
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{svc.name}</span>
                <button className="pill-btn" style={{ fontSize: 13, padding: "6px 16px" }}>Connect</button>
              </div>
              {idx < musicServices.length - 1 && (
                <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 16px" }} />
              )}
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Frame Picker Sheet — manages its own BottomSheet + store interaction */}
      <FramePicker
        open={activeSheet === "frame"}
        onClose={() => setActiveSheet(null)}
        selectedFrameId={selectedFrame?.id ?? null}
        onSelect={setSelectedFrame}
      />
    </div>
  );
}
