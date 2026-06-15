import { useState } from "react";
import BottomSheet from "../sheets/bottom-sheet";
import PickerSection from "./picker-section";
import SystemSection from "./system-section";
import FrameSection from "./frame-section";
import EmojiPollModal from "./emoji-poll-modal";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

// Sectioned caption picker. Three tiers (Locket-style):
//   VIP        — photo frames (highlighted). Picking a frame is a frame action
//                (host's onSelectFrame), distinct from the overlay flow.
//   General    — default captions: text (custome) + live system data (weather,
//                location, music…) rendered by SystemSection.
//   Decorative — everything else: decorative / background / special / icon / gif.
// Empty overlay groups hide themselves. Picking a caption pill yields the
// canonical overlay to the host and closes the sheet.
const GENERAL_GROUPS = ["custome"];
const DECORATIVE_GROUPS = ["decorative", "background", "special", "image_icon", "image_gif"];

export default function CaptionPickerSheet({
  open,
  onClose,
  captionOverlays = {},
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

  // Poll selection: build a canonical poll overlay and forward to onSelect.
  // The payload is forwarded as-is through toOverlayData / payload-services
  // (payload passthrough already in place, no changes needed there).
  const handlePollSelect = ({ left_emoji, right_emoji }) => {
    const pollOverlay = normalizeOverlay({
      overlay_id: "caption:poll",
      type: "poll",
      payload: { left_emoji, right_emoji },
    });
    onSelect?.(pollOverlay);
    onClose?.();
  };

  const groupItems = (groups) =>
    groups.flatMap((g) => captionOverlays[g] || []).map(normalizeOverlay);

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Chú thích">
        <div style={{ padding: "12px 16px 32px" }}>
          {/* VIP — photo frames */}
          <FrameSection selectedFrameId={selectedFrameId} onSelect={handlePickFrame} />

          {/* General — text + live system data */}
          <PickerSection
            label="General"
            items={groupItems(GENERAL_GROUPS)}
            selectedId={selectedId}
            onSelect={handlePick}
          />
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

          {/* Decorative — everything else */}
          <PickerSection
            label="Decorative"
            items={groupItems(DECORATIVE_GROUPS)}
            selectedId={selectedId}
            onSelect={handlePick}
          />

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
