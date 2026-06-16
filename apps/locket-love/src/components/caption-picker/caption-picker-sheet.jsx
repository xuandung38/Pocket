import { useState } from "react";
import BottomSheet from "../sheets/bottom-sheet";
import PickerSection from "./picker-section";
import SystemSection from "./system-section";
import FrameSection from "./frame-section";
import EmojiPollModal from "./emoji-poll-modal";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

// Sectioned caption picker over the Locket Dio v2 dataset. Three Locket-style
// tiers, each holding the relevant upstream sections (rendered by section name):
//   VIP        — photo frames (FrameSection) + caption icon/gif (early access).
//   General    — text gradients (suggest) + live system data + poll.
//   Decorative — decorative + Dio templates + zodiac (star_sign).
// Picking a frame is a frame action (onSelectFrame); picking a caption pill
// yields the canonical overlay (onSelect). Empty sections hide themselves.
const VIP_SECTIONS = ["caption_icon_by_locketdio", "caption_gif_by_locketdio"];
const GENERAL_SECTIONS = ["suggest"];
const DECORATIVE_SECTIONS = ["decorative", "decorative_by_locketdio", "star_sign"];

function TierLabel({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 8px" }}>
      {children}
    </div>
  );
}

export default function CaptionPickerSheet({
  open,
  onClose,
  sections = [],
  selectedId = null,
  onSelect,
  selectedFrameId = null,
  onSelectFrame,
  // Current poll payload {left_emoji, right_emoji} — forwarded to the modal so
  // single-side edits can merge rather than wipe the other side.
  pollPayload = null,
  footer = null,
}) {
  const [pollModalOpen, setPollModalOpen] = useState(false);

  const handlePick = (overlay) => {
    onSelect?.(overlay);
    onClose?.();
  };

  const handlePickFrame = (frame) => {
    onSelectFrame?.(frame);
    onClose?.();
  };

  const handlePollSelect = ({ left_emoji, right_emoji }) => {
    const pollOverlay = normalizeOverlay({
      overlay_id: "caption:poll",
      type: "poll",
      payload: { left_emoji, right_emoji },
    });
    onSelect?.(pollOverlay);
    onClose?.();
  };

  // Resolve upstream sections (already normalized items) for a tier, preserving
  // the configured order and dropping any the dataset didn't include.
  const tierSections = (ids) =>
    ids.map((id) => sections.find((s) => s.section_id === id)).filter(Boolean);

  const renderSections = (ids) =>
    tierSections(ids).map((s) => (
      <PickerSection
        key={s.section_id}
        label={s.name}
        items={s.items}
        selectedId={selectedId}
        onSelect={handlePick}
      />
    ));

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Chú thích">
        <div style={{ padding: "12px 16px 32px" }}>
          {/* VIP — photo frames + early-access caption icon/gif */}
          <FrameSection selectedFrameId={selectedFrameId} onSelect={handlePickFrame} />
          {renderSections(VIP_SECTIONS)}

          {/* General — text gradients + live system data + poll */}
          <TierLabel>General</TierLabel>
          {renderSections(GENERAL_SECTIONS)}
          <SystemSection onSelect={handlePick} />

          {/* Poll — opens emoji pair picker modal */}
          <div style={{ padding: "8px 0 4px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
              Poll
            </div>
            <button
              className="pill-btn"
              onClick={() => setPollModalOpen(true)}
              style={{ fontSize: 15 }}
            >
              🗳️ Tạo poll emoji
            </button>
          </div>

          {/* Decorative — decorative + Dio templates + zodiac */}
          <TierLabel>Decorative</TierLabel>
          {renderSections(DECORATIVE_SECTIONS)}

          {footer}
        </div>
      </BottomSheet>

      {/* Poll emoji pair selector — opens on top of the caption sheet.
          value forwards current pair so single-side edits preserve the other emoji. */}
      <EmojiPollModal
        open={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        onSelect={handlePollSelect}
        value={pollPayload}
      />
    </>
  );
}
