import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import BottomSheet from "../components/sheets/bottom-sheet";
import Avatar from "../components/ui/avatar";
import {
  captionStickersGeneral,
  captionStickersDecorative,
  musicServices,
  friends,
  feedMoments,
} from "../data/mock-data";

// Demo photo for the send preview — keyboard/desk photo matching original design
const DEMO_PHOTO =
  "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=85";

// Paper-plane send icon
function SendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 2L11 13"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Swipeable caption list — slot 0 is the editable message bubble.
// Slots 1..7 show stickers from the General set (read-only when swiped).
// Picking "Aa Văn bản" (id="text") from the sheet opens an inline editor.
const QUICK_CAPTIONS = [null, ...captionStickersGeneral.slice(0, 7)];
const SWIPE_THRESHOLD = 40; // px drag distance to trigger a swipe

export default function SendScreen() {
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState(null);
  const [sheetCaption, setSheetCaption] = useState(null);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [customMessage, setCustomMessage] = useState("");   // slot 0
  const [aaText, setAaText] = useState("");                  // sheet "text" sticker
  const [editingMessage, setEditingMessage] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState(["all"]);

  // Pointer drag tracking for real swipe gesture on the photo
  const dragStartX = useRef(null);

  function toggleRecipient(id) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  function cycleCaption(direction) {
    setEditingMessage(false);
    setSheetCaption(null);
    setCaptionIndex(
      (prev) => (prev + direction + QUICK_CAPTIONS.length) % QUICK_CAPTIONS.length
    );
  }

  function selectFromSheet(sticker) {
    const isToggleOff = sheetCaption?.id === sticker.id;
    if (isToggleOff) {
      setSheetCaption(null);
      setEditingMessage(false);
    } else {
      setSheetCaption(sticker);
      // "Aa Văn bản" opens inline text editor
      setEditingMessage(sticker.id === "text");
    }
    setActiveSheet(null);
  }

  function handlePointerDown(e) {
    dragStartX.current = e.clientX;
  }

  function handlePointerUp(e) {
    if (dragStartX.current == null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      cycleCaption(dx < 0 ? 1 : -1); // swipe left = next, swipe right = prev
    }
  }

  const allSelected = selectedRecipients.includes("all");
  // Caption resolution: Aa sheet pick → editable Aa caption; slot 0 → message bubble
  const isAaCaption = sheetCaption?.id === "text";
  const isMessageSlot = !sheetCaption && captionIndex === 0;
  const isEditableSlot = isAaCaption || isMessageSlot;
  const slotSticker = QUICK_CAPTIONS[captionIndex];
  const activeSticker = sheetCaption || slotSticker;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — pushed down from top edge */}
      <div
        style={{
          flexShrink: 0,
          height: 52,
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
          Gửi đến...
        </span>
        <button
          className="icon-btn"
          style={{ position: "absolute", right: 16, background: "none", backdropFilter: "none" }}
        >
          <Download size={22} />
        </button>
      </div>

      {/* Photo preview — full-width 1:1 square (matches camera viewfinder) */}
      <div style={{ flexShrink: 0, padding: "0 12px", position: "relative" }}>
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => (dragStartX.current = null)}
          style={{
            borderRadius: 28,
            overflow: "hidden",
            position: "relative",
            paddingBottom: "100%",
            background: "#111",
            touchAction: "pan-y",
            userSelect: "none",
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <img
              src={DEMO_PHOTO}
              alt="preview"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            {/* Swipe left arrow — cycles caption backward */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => cycleCaption(-1)}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(6px)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Swipe right arrow — cycles caption forward */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => cycleCaption(1)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(6px)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <ChevronRight size={18} />
            </button>

            {/* Caption chip overlay — flush to bottom edge */}
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                maxWidth: "85%",
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
                          background: pillBg,
                          backdropFilter: "blur(10px)",
                          borderRadius: 20,
                          padding: "8px 18px",
                          fontSize: pillFontSize,
                          color: "#fff",
                          fontWeight: pillWeight,
                          border: "none",
                          outline: "none",
                          textAlign: "center",
                          minWidth: 200,
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={() => setEditingMessage(true)}
                      style={{
                        background: pillBg,
                        backdropFilter: "blur(10px)",
                        borderRadius: 20,
                        padding: "8px 18px",
                        fontSize: pillFontSize,
                        color: value ? "#fff" : "rgba(255,255,255,0.7)",
                        fontWeight: pillWeight,
                        cursor: "text",
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
                    fontSize: 15,
                    fontWeight: 600,
                    padding: "8px 18px",
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

      {/* Bottom section — 3 zones (dots, action bar, recipients) anchored under photo */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          paddingTop: 10,
          gap: 10,
        }}
      >
        {/* Slide indicator dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 5,
            padding: "6px 0",
          }}
        >
          {QUICK_CAPTIONS.map((_, i) => {
            const active = i === captionIndex && !sheetCaption;
            return (
              <div
                key={i}
                style={{
                  width: active ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: active ? "#fff" : "rgba(255,255,255,0.22)",
                  transition: "width 0.15s",
                }}
              />
            );
          })}
        </div>

        {/* Action bar — X | Send | Aa+ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "6px 32px",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <X size={20} />
          </button>

          <button
            style={{
              width: 62,
              height: 62,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SendIcon />
          </button>

          <button
            onClick={() => setActiveSheet("caption")}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              gap: 1,
            }}
          >
            Aa<sup style={{ fontSize: 9 }}>✦</sup>
          </button>
        </div>

        {/* Recipients row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 18,
            padding: "6px 16px 8px",
          }}
        >

        {/* "Tất cả" recipient */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <button
            onClick={() => toggleRecipient("all")}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: allSelected ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.1)",
              border: `2.5px solid ${allSelected ? "var(--accent-yellow)" : "transparent"}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Group people icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill={allSelected ? "var(--accent-yellow)" : "rgba(255,255,255,0.6)"}>
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </button>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: allSelected ? "var(--accent-yellow)" : "var(--text-secondary)",
            }}
          >
            Tất cả
          </span>
        </div>

        {/* Friend recipients */}
        {friends.map((f) => {
          const isSelected = selectedRecipients.includes(f.id);
          return (
            <div
              key={f.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
            >
              <button
                onClick={() => toggleRecipient(f.id)}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  padding: 0,
                  border: `2.5px solid ${isSelected ? "var(--accent-yellow)" : "rgba(255,255,255,0.2)"}`,
                  cursor: "pointer",
                  overflow: "hidden",
                  background: "none",
                }}
              >
                <Avatar src={f.avatar} name={f.name} size={46} />
              </button>
              <span
                style={{
                  fontSize: 12,
                  color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                  maxWidth: 58,
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.name.split(" ")[0]}...
              </span>
            </div>
          );
        })}
        </div>
      </div>{/* end bottom section */}

      {/* Caption Sheet */}
      <BottomSheet
        open={activeSheet === "caption"}
        onClose={() => setActiveSheet(null)}
        title="Chú thích"
      >
        <div style={{ padding: "12px 16px 32px" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>General</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {captionStickersGeneral.map((s) => (
              <button
                key={s.id}
                onClick={() => selectFromSheet(s)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: `2px solid ${sheetCaption?.id === s.id ? "#fff" : "transparent"}`,
                  background: s.bg,
                  color: s.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>Decorative</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {captionStickersDecorative.map((s) => (
              <button
                key={s.id}
                onClick={() => selectFromSheet(s)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: `2px solid ${sheetCaption?.id === s.id ? "#fff" : "transparent"}`,
                  background: s.bg,
                  color: s.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
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
      <BottomSheet
        open={activeSheet === "music"}
        onClose={() => setActiveSheet(null)}
        title="Chọn dịch vụ"
      >
        <div style={{ padding: "8px 0 32px" }}>
          {musicServices.map((svc, idx) => (
            <div key={svc.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: svc.color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {svc.id === "spotify" ? "🎵" : "🎶"}
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{svc.name}</span>
                <button className="pill-btn" style={{ fontSize: 13, padding: "6px 16px" }}>
                  Connect
                </button>
              </div>
              {idx < musicServices.length - 1 && (
                <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 16px" }} />
              )}
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
