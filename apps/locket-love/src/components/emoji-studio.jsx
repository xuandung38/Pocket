// emoji-studio.jsx
// Bottom-sheet emoji picker for moment reactions. Phase 7 owns it.
//
// Trigger: friend-moment cards' "+" button opens this with a target momentUid.
// Pick → sendReactionOnMoment(momentUid, emoji) → toast → close.
//
// Two interaction modes:
//   - Tap        → power = 0 (a "simple" reaction)
//   - Hold ≥600ms → power ramps 0→100 → release sends with the held power
//                  (mirrors the lovekit reference UX so users feel at home).
//
// Props (controlled component — host owns open + target):
//   open     : boolean
//   onClose  : () => void
//   momentUid: string | null   - target moment id; nothing sent when null
//   onSent?  : (emoji: string) => void  - optional optimistic notifier
//
// Recent emojis persist in localStorage so the user's go-to picks float to the
// top across reloads. Failure to read/write storage is non-fatal.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { sendReactionOnMoment } from "@/services/rollcall-services";
import {
  SonnerError,
  SonnerSuccess,
} from "@/components/ui/sonner-toast";

// Core emoji set — mirrors locket-dark `EMOJI_REACTIONS` + extras seen in
// lovekit. Order is intentional (most common first).
const POPULAR = [
  "🔥", "😍", "❤️", "😂", "🥰", "😎",
  "👏", "🥹", "🤣", "✨", "💀", "💯",
  "🙌", "😭", "🤔", "👀", "🙁", "😮",
];

const ALL = [
  ...POPULAR,
  "💖", "💛", "💚", "💙", "💜", "🖤",
  "🤍", "🤎", "💕", "💞", "💓", "💗",
  "🌹", "🌟", "⭐", "🌈", "☀️", "🌙",
  "🎉", "🎊", "🥳", "🤩", "😇", "🥺",
  "😅", "😆", "😊", "😋", "😘", "😗",
  "🤗", "🤭", "🤫", "🤥", "😶", "😐",
  "😏", "😜", "😝", "🤤", "🤓", "😺",
  "👍", "👎", "👌", "✌️", "🤞", "🤟",
  "🤘", "👋", "🙏", "💪", "🤝", "👊",
];

const HOLD_DELAY_MS = 600;
const HOLD_TICK_MS = 50;
const POWER_MAX = 100;
const POWER_STEP = 1;

// Read recent emojis from localStorage. Resilient to JSON parse / storage errors.
function loadRecent() {
  try {
    const raw = localStorage.getItem("recentEmojis");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

// Persist recent emoji list. Quietly ignores quota / storage errors.
function persistRecent(list) {
  try {
    localStorage.setItem("recentEmojis", JSON.stringify(list));
  } catch {
    /* localStorage may be disabled; ignore */
  }
}

export default function EmojiStudio({ open, onClose, momentUid, onSent }) {
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState(loadRecent);

  // Hold-to-power state (mirrors lovekit UX)
  const [activeKey, setActiveKey] = useState(null);
  const [isHolding, setIsHolding] = useState(false);
  const [power, setPower] = useState(0);

  const holdTimer = useRef(null);
  const holdInterval = useRef(null);
  const sentRef = useRef(false);

  // Reset transient state whenever the sheet closes so the next open is clean.
  useEffect(() => {
    if (!open) {
      setSearch("");
      cleanup();
    }
    // intentionally not depending on cleanup — it's stable inline
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clear any timers on unmount; otherwise a fast unmount during hold would
  // fire setState against an unmounted component.
  useEffect(() => () => cleanup(), []);

  function cleanup() {
    clearTimeout(holdTimer.current);
    clearInterval(holdInterval.current);
    holdTimer.current = null;
    holdInterval.current = null;
    sentRef.current = false;
    setActiveKey(null);
    setIsHolding(false);
    setPower(0);
  }

  // ---- Send ---------------------------------------------------------------
  async function send(emoji, atPower = 0) {
    if (!momentUid) {
      cleanup();
      onClose?.();
      return;
    }
    if (sentRef.current) return;
    sentRef.current = true;

    // Bump recent list (skip if it's already at the top).
    if (recent[0] !== emoji) {
      const nextRecent = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 10);
      setRecent(nextRecent);
      persistRecent(nextRecent);
    }

    // Close sheet first so the toast animation isn't behind the overlay.
    onClose?.();
    onSent?.(emoji);

    try {
      const res = await sendReactionOnMoment(momentUid, emoji, atPower);
      if (res == null) {
        SonnerError("Gửi cảm xúc thất bại!");
      } else {
        SonnerSuccess(
          `Đã gửi ${emoji}${atPower > 0 ? ` (Power ${atPower})` : ""}`,
        );
      }
    } catch (err) {
      console.error("[EmojiStudio] send failed:", err);
      SonnerError("Gửi cảm xúc thất bại!");
    } finally {
      cleanup();
    }
  }

  // ---- Hold handlers ------------------------------------------------------
  function handlePressStart(emoji, key) {
    sentRef.current = false;
    setActiveKey(key);
    setPower(0);
    setIsHolding(false);
    holdTimer.current = setTimeout(() => {
      setIsHolding(true);
      holdInterval.current = setInterval(() => {
        setPower((prev) => {
          if (prev >= POWER_MAX) {
            clearInterval(holdInterval.current);
            return POWER_MAX;
          }
          return prev + POWER_STEP;
        });
      }, HOLD_TICK_MS);
    }, HOLD_DELAY_MS);
  }

  function handlePressEnd(emoji, key) {
    if (sentRef.current) return;
    if (activeKey !== key) return;
    const finalPower = isHolding ? power : 0;
    send(emoji, finalPower);
  }

  function handlePressCancel() {
    if (sentRef.current) return;
    cleanup();
  }

  if (!open) return null;

  const trimmed = search.trim().toLowerCase();
  const filteredAll = trimmed
    ? ALL.filter((e) => e.toLowerCase().includes(trimmed))
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 62,
          animation: "fadeIn 0.25s ease-out",
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Chọn cảm xúc"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "70%",
          background: "var(--bg-primary, #0c0c0c)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "12px 0 16px",
          color: "var(--text-primary, #fff)",
          zIndex: 63,
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Drag handle */}
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 4,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 2,
            margin: "0 auto 12px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 16px 12px",
          }}
        >
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>
            Emoji studio
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary, rgba(255,255,255,0.6))",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "0 16px 8px", fontSize: 12, color: "var(--text-secondary, rgba(255,255,255,0.6))" }}>
          Chạm để gửi • Giữ để tăng power
        </div>

        {/* Search */}
        <div style={{ padding: "0 16px 12px" }}>
          <input
            type="text"
            placeholder="Tìm emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: "var(--bg-elevated, rgba(255,255,255,0.08))",
              color: "var(--text-primary, #fff)",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Grid — scrollable */}
        <div
          className="scroll-area"
          style={{ flex: 1, padding: "0 16px 8px", overflowY: "auto" }}
        >
          {filteredAll ? (
            <EmojiGroup
              title="Kết quả tìm kiếm"
              emojis={filteredAll}
              activeKey={activeKey}
              isHolding={isHolding}
              power={power}
              onPressStart={handlePressStart}
              onPressEnd={handlePressEnd}
              onPressCancel={handlePressCancel}
              groupKey="search"
            />
          ) : (
            <>
              {recent.length > 0 && (
                <EmojiGroup
                  title="Gần đây"
                  emojis={recent}
                  activeKey={activeKey}
                  isHolding={isHolding}
                  power={power}
                  onPressStart={handlePressStart}
                  onPressEnd={handlePressEnd}
                  onPressCancel={handlePressCancel}
                  groupKey="recent"
                />
              )}
              <EmojiGroup
                title="Phổ biến"
                emojis={POPULAR}
                activeKey={activeKey}
                isHolding={isHolding}
                power={power}
                onPressStart={handlePressStart}
                onPressEnd={handlePressEnd}
                onPressCancel={handlePressCancel}
                groupKey="popular"
              />
              <EmojiGroup
                title="Tất cả"
                emojis={ALL}
                activeKey={activeKey}
                isHolding={isHolding}
                power={power}
                onPressStart={handlePressStart}
                onPressEnd={handlePressEnd}
                onPressCancel={handlePressCancel}
                groupKey="all"
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Internal group renderer ---------------------------------------------

function EmojiGroup({
  title,
  emojis,
  activeKey,
  isHolding,
  power,
  onPressStart,
  onPressEnd,
  onPressCancel,
  groupKey,
}) {
  if (!emojis?.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary, rgba(255,255,255,0.6))",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 8,
        }}
      >
        {emojis.map((emoji, idx) => {
          const key = `${groupKey}-${emoji}-${idx}`;
          const active = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onPressStart(emoji, key);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onPressEnd(emoji, key);
              }}
              onPointerLeave={onPressCancel}
              onPointerCancel={onPressCancel}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={`Phản ứng ${emoji}`}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                background: active
                  ? "rgba(255,255,255,0.12)"
                  : "var(--bg-elevated, rgba(255,255,255,0.05))",
                border: "none",
                borderRadius: 14,
                fontSize: 30,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
                WebkitUserSelect: "none",
                transition: "transform 0.1s, background 0.15s",
                transform: active && isHolding ? "scale(1.15)" : "none",
              }}
            >
              {emoji}
              {active && isHolding && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--accent-yellow, #f5a623)",
                    color: "#000",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 999,
                    minWidth: 22,
                    textAlign: "center",
                  }}
                >
                  {power}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
