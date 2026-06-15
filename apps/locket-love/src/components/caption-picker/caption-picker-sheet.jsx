import BottomSheet from "../sheets/bottom-sheet";
import PickerSection from "./picker-section";
import SystemSection from "./system-section";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

// Sectioned caption picker (replaces the old flat "Chú thích" sheet). Each row
// maps one or more overlay-store groups to a labelled pill section; empty groups
// hide themselves. Picking a pill yields the canonical overlay object to the
// host and closes the sheet. `footer` + the comment slots below are where the
// later phases plug richer sections (system live-data P3, image upload P4,
// music P5) without touching this wrapper.
const SECTIONS = [
  { key: "themes", label: "Themes", groups: ["custome", "background", "decorative"] },
  { key: "special", label: "Đặc biệt", groups: ["special"] },
  { key: "icon", label: "Icon", groups: ["image_icon"] },
  { key: "gif", label: "GIF", groups: ["image_gif"] },
];

export default function CaptionPickerSheet({
  open,
  onClose,
  captionOverlays = {},
  selectedId = null,
  onSelect,
  footer = null,
}) {
  const handlePick = (overlay) => {
    onSelect?.(overlay);
    onClose?.();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Chú thích">
      <div style={{ padding: "12px 16px 32px" }}>
        {SECTIONS.map((s) => {
          const items = s.groups
            .flatMap((g) => captionOverlays[g] || [])
            .map(normalizeOverlay);
          return (
            <PickerSection
              key={s.key}
              label={s.label}
              items={items}
              selectedId={selectedId}
              onSelect={handlePick}
            />
          );
        })}

        <SystemSection onSelect={handlePick} />

        {footer}
      </div>
    </BottomSheet>
  );
}
