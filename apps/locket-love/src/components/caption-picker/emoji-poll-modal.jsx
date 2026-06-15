// emoji-poll-modal.jsx
// Bottom-sheet modal for selecting a poll emoji pair or tweaking one side.
// Two tabs:
//   "Gợi ý cặp" — grid of preset pairs; pick one → onSelect({left_emoji,right_emoji}) + close.
//   "Chỉnh lẻ"  — side selector (left / right) + flat emoji grid.
//                 Pick an emoji → onSelect(merged full payload), modal stays open so
//                 the user can edit the other side before closing manually.
//
// Props:
//   open      — boolean
//   onClose   — called when backdrop tapped or pair picked
//   onSelect  — called with {left_emoji, right_emoji} on every pick
//   value     — current poll payload {left_emoji, right_emoji}; used to:
//                 1. display current emojis in the side selector
//                 2. merge single-side edits (don't wipe the other side)
//               Falls back to 👍/👎 when absent.

import { useState, useEffect } from "react";

const DEFAULT_LEFT  = "👍";
const DEFAULT_RIGHT = "👎";

const EMOJI_PAIRS = [
  { left: "👍", right: "👎" },
  { left: "🔥", right: "❄️" },
  { left: "😂", right: "😢" },
  { left: "😍", right: "😡" },
  { left: "🎉", right: "💀" },
  { left: "💯", right: "🧊" },
  { left: "⚡", right: "🌧️" },
  { left: "🚀", right: "🪨" },
  { left: "❤️", right: "💔" },
  { left: "😎", right: "🤡" },
  { left: "👀", right: "🙈" },
  { left: "🥵", right: "🥶" },
  { left: "🤝", right: "✋" },
  { left: "💪", right: "🪫" },
  { left: "🎯", right: "🎲" },
];

const SINGLE_EMOJIS = [
  "👍", "👎", "👌", "✌️", "🤞",
  "🔥", "❄️", "⚡", "💥", "🌧️",
  "😂", "😢", "😭", "😍", "😡",
  "😎", "🤡", "🥶", "🥵", "👀",
  "❤️", "💔", "💘", "💞", "💯",
  "🎉", "🎊", "🥳", "💀", "☠️",
  "💪", "🪫", "🚀", "🪨", "🎯",
  "🙏", "👏", "🤝", "✋", "🙌",
];

const SLIDE_DURATION = 300;

export default function EmojiPollModal({
  open,
  onClose,
  onSelect,
  value = null, // {left_emoji, right_emoji} | null
}) {
  const [mounted,    setMounted]    = useState(false);
  const [visible,    setVisible]    = useState(false);
  const [tab,        setTab]        = useState("pair");
  // Internal side selection — default left; reset to left each time modal opens.
  const [activeSide, setActiveSide] = useState("left");

  useEffect(() => {
    if (open) {
      setMounted(true);
      setTab("pair");
      setActiveSide("left");
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), SLIDE_DURATION);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  // Current pair — from value prop or defaults.
  const currentLeft  = value?.left_emoji  ?? DEFAULT_LEFT;
  const currentRight = value?.right_emoji ?? DEFAULT_RIGHT;

  function handlePair(pair) {
    onSelect?.({ left_emoji: pair.left, right_emoji: pair.right });
    onClose?.();
  }

  function handleSingle(emoji) {
    // Merge: update only the active side, preserve the other from current value.
    const merged =
      activeSide === "left"
        ? { left_emoji: emoji,        right_emoji: currentRight }
        : { left_emoji: currentLeft,  right_emoji: emoji        };
    onSelect?.(merged);
    // Stay open — user may want to edit the other side without reopening.
  }

  // ---- Styles ---------------------------------------------------------------

  const sideBtn = (side) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "8px 20px",
    borderRadius: 14,
    border: `2px solid ${activeSide === side ? "var(--accent-yellow)" : "transparent"}`,
    background: activeSide === side ? "var(--accent-yellow-dim)" : "var(--bg-elevated)",
    cursor: "pointer",
    fontSize: 28,
    fontWeight: 700,
    color: "var(--text-primary)",
    transition: "border-color 0.15s, background 0.15s",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 62,
        opacity: visible ? 1 : 0,
        transition: `opacity ${SLIDE_DURATION}ms ease`,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "66%",
          background: "var(--bg-surface)",
          borderRadius: "24px 24px 0 0",
          zIndex: 63,
          display: "flex",
          flexDirection: "column",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: `transform ${SLIDE_DURATION}ms cubic-bezier(0.32,0.72,0,1)`,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>
          <div className="sheet-handle" />
        </div>

        {/* Title */}
        <h3
          style={{
            textAlign: "center",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--text-primary)",
            padding: "10px 0 8px",
          }}
        >
          Chọn emoji poll
        </h3>

        {/* Tab switcher */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "0 16px 12px" }}>
          {[
            { key: "pair",   label: "Gợi ý cặp" },
            { key: "single", label: "Chỉnh lẻ"  },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "6px 18px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                background: tab === key ? "var(--accent-yellow)" : "var(--bg-elevated)",
                color: tab === key ? "#000" : "var(--text-primary)",
                transition: "background 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 24px" }}>

          {/* ---- Pair tab ---- */}
          {tab === "pair" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {EMOJI_PAIRS.map((pair, idx) => (
                <button
                  key={idx}
                  data-pair-btn="true"
                  onClick={() => handlePair(pair)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: "14px 10px",
                    borderRadius: 16,
                    background: "var(--bg-elevated)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 26,
                    transition: "opacity 0.15s",
                  }}
                >
                  <span>{pair.left}</span>
                  <span>{pair.right}</span>
                </button>
              ))}
            </div>
          )}

          {/* ---- Single tab ---- */}
          {tab === "single" && (
            <>
              {/* Side selector — shows current emojis, highlights active side */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  padding: "4px 0 14px",
                }}
              >
                <button
                  data-side-btn="true"
                  data-active={String(activeSide === "left")}
                  onClick={() => setActiveSide("left")}
                  style={sideBtn("left")}
                >
                  {currentLeft}
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                    Trái
                  </span>
                </button>
                <button
                  data-side-btn="true"
                  data-active={String(activeSide === "right")}
                  onClick={() => setActiveSide("right")}
                  style={sideBtn("right")}
                >
                  {currentRight}
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                    Phải
                  </span>
                </button>
              </div>

              {/* Emoji grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 6,
                }}
              >
                {SINGLE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    data-single-btn="true"
                    onClick={() => handleSingle(emoji)}
                    style={{
                      fontSize: 26,
                      padding: 8,
                      borderRadius: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
