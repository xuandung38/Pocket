import CaptionPill from "./caption-pill";

// One labelled group of caption pills (Themes / Special / Icon / GIF …). Hidden
// entirely when it has no items — keeps the sheet compact while the themes API
// returns [] for self-hosted. `items` are already canonical overlay objects.
export default function PickerSection({ label, items, selectedId, onSelect }) {
  if (!items || items.length === 0) return null;

  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {items.map((ov, i) => (
          <CaptionPill
            key={`${ov.overlay_id}-${i}`}
            overlay={ov}
            selected={ov.overlay_id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
