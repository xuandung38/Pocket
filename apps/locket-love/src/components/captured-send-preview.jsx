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
import FramePicker from "./frame-picker";
import PhotoCropper from "./photo-cropper";
import CaptionOverlay from "./caption-overlay/caption-overlay";
import CaptionPickerSheet from "./caption-picker/caption-picker-sheet";
import MusicLinkSheet from "./caption-picker/music-link-sheet";
import { useOverlayStore, useFrameStore } from "@/stores";
import { normalizeOverlay, toOverlayData } from "@/utils/caption-overlay-schema";

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
  const [editingMessage, setEditingMessage] = useState(false);
  // selectedOverlay: the canonical overlay chosen from the picker sheet (null =
  // follow the carousel; slot 0 + null = editable plain-message slot).
  const [selectedOverlay, setSelectedOverlay] = useState(null);
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

  // Carousel slots: slot 0 = message bubble, slots 1..N = raw API theme presets.
  const quickCaptions = useMemo(() => {
    const apiSlots = [...captionOverlays.custome, ...captionOverlays.decorative].slice(0, 7);
    return [null, ...apiSlots];
  }, [captionOverlays]);

  function toggleRecipient(id) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  function cycleCaption(direction) {
    setEditingMessage(false);
    setSelectedOverlay(null);
    setCaptionIndex(
      (prev) => (prev + direction + quickCaptions.length) % quickCaptions.length,
    );
  }

  // Picker pick → toggle the canonical overlay (re-picking the active one clears
  // it back to the message slot). The picker sheet closes itself after onSelect.
  function handleSelectOverlay(overlay) {
    setSelectedOverlay((prev) =>
      prev?.overlay_id === overlay.overlay_id ? null : overlay,
    );
    setEditingMessage(false);
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
  const isMessageSlot = !selectedOverlay && captionIndex === 0;
  const isEditableSlot = isMessageSlot;
  // Canonical overlay currently shown: the picker selection wins, else the active
  // carousel slot (raw preset) folded to canonical; null on the message slot.
  const activeOverlay = useMemo(() => {
    if (selectedOverlay) return selectedOverlay;
    const slot = quickCaptions[captionIndex];
    return slot ? normalizeOverlay(slot) : null;
  }, [selectedOverlay, quickCaptions, captionIndex]);
  // Caption text shown in the polaroid bottom strip preview — same caption that
  // handleSend bakes: typed message on the message slot, else the overlay caption.
  const captionForPolaroid = isMessageSlot ? customMessage : activeOverlay?.caption ?? "";

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
    // Message slot → plain typed caption (default overlay); otherwise the active
    // overlay carries its own caption alongside its metadata.
    const caption = isMessageSlot ? customMessage : activeOverlay?.caption ?? "";
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
      // FIX: forward the flat overlay fields the BE actually reads (payload-
      // services optionsData) instead of the ignored { sticker } shape. Empty on
      // the plain-message slot.
      overlayData: isMessageSlot ? {} : toOverlayData(activeOverlay),
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

            {/* Caption overlay — z-index above the photo-frame layer (frame is
                rendered at z-index 100 inside PhotoCropper) so the caption always
                sits ON TOP of the frame, never hidden behind it. */}
            <div
              style={{
                // Full-width centered row (NOT left:50% shrink-to-fit, which
                // collapsed the chip and truncated short captions like "76%").
                position: "absolute", bottom: 14, left: 0, right: 0,
                display: "flex", justifyContent: "center",
                padding: "0 16px", zIndex: 110,
              }}
            >
              {isEditableSlot ? (
                (() => {
                  const placeholder = "Thêm một tin nhắn";
                  const pillBg = "rgba(0,0,0,0.45)";
                  const value = customMessage;
                  const pillWeight = value ? 600 : 500;
                  if (editingMessage) {
                    return (
                      <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        onBlur={() => setEditingMessage(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") setEditingMessage(false);
                        }}
                        placeholder={placeholder}
                        style={{
                          background: pillBg, backdropFilter: "blur(10px)",
                          borderRadius: 20, padding: "8px 18px",
                          fontSize: 14, color: "#fff", fontWeight: pillWeight,
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
                        fontSize: 14, fontWeight: pillWeight,
                        color: value ? "#fff" : "rgba(255,255,255,0.7)", cursor: "text",
                      }}
                    >
                      {value || placeholder}
                    </div>
                  );
                })()
              ) : activeOverlay ? (
                <CaptionOverlay overlay={activeOverlay} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", paddingTop: 10, gap: 10 }}>
        {/* Pagination dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, padding: "6px 0" }}>
          {quickCaptions.map((_, i) => {
            const active = i === captionIndex && !selectedOverlay;
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

      {/* Caption Sheet — sectioned picker (Themes/Special/Icon/GIF; later phases
          plug system/image/music sections + the music button footer). */}
      <CaptionPickerSheet
        open={activeSheet === "caption"}
        onClose={() => setActiveSheet(null)}
        captionOverlays={captionOverlays}
        selectedId={selectedOverlay?.overlay_id ?? null}
        onSelect={handleSelectOverlay}
        footer={
          <button
            className="pill-btn"
            onClick={() => setActiveSheet("music")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            🎵 Thêm nhạc
          </button>
        }
      />

      {/* Music link sheet — paste a Spotify/Apple link → resolved music overlay */}
      <MusicLinkSheet
        open={activeSheet === "music"}
        onClose={() => setActiveSheet(null)}
        onSubmit={(overlay) => {
          handleSelectOverlay(overlay);
          setActiveSheet(null);
        }}
      />

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
