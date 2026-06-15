import BottomSheet from "../sheets/bottom-sheet";
import PickerSection from "./picker-section";
import SystemSection from "./system-section";
import FrameSection from "./frame-section";
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
  footer = null,
}) {
  const handlePick = (overlay) => {
    onSelect?.(overlay);
    onClose?.();
  };

  const handlePickFrame = (frame) => {
    onSelectFrame?.(frame);
    onClose?.();
  };

  const groupItems = (groups) =>
    groups.flatMap((g) => captionOverlays[g] || []).map(normalizeOverlay);

  return (
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
  );
}
