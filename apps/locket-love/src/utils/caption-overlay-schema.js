// caption-overlay-schema.js
// Canonical overlay shape consumed by the shared <CaptionOverlay> renderer used
// in BOTH the compose preview (captured-send-preview) and the feed (feed-screen).
//
// Three producers feed into this one shape, so `normalizeOverlay` folds them all
// into the flat canonical object below:
//   1. Theme presets from the themes API   → { preset_id, color_text, ... }
//   2. The compose picker / POST payload    → flat { overlay_id, type, color_top, ... }
//   3. Feed moments from the self-hosted API → moment.overlays
//      { id, type, text, textColor, background:{colors:[…]}, icon:{type,data}, payload }
//      (surfaced by the API's normalizeMoment; the moment's free text lives on
//       moment.caption, so feed callers merge it in before normalizing.)

export const defaultOverlay = {
  overlay_id: "standard",
  color_top: "",        // gradient top
  color_bottom: "",     // gradient bottom
  text_color: "#FFFFFF",
  icon: "",             // emoji | image URL | (battery: charging bool) | (review: rating)
  caption: "",
  type: "default",      // default|custome|background|decorative|special|image_icon|image_gif|time|battery|weather|location|review|heart|music
};

// Icon is polymorphic. The API stores it as a { type, data } map; presets/payload
// store it as a raw string/number/bool. Preserve numbers (review rating) and
// booleans (battery charging); unwrap maps to their `data`; pass strings through.
function normalizeIcon(icon) {
  if (icon == null) return "";
  if (typeof icon === "object") {
    // SF Symbols are iOS-only glyph names ("battery.100", "location.fill") with
    // no web equivalent — drop them so they never render as literal caption text.
    if (icon.type === "sf_symbol") return "";
    return icon.data ?? "";
  }
  return icon;
}

// Native Locket + the self-hosted API store every overlay with a generic
// overlay_type "caption" and the real kind encoded in overlay_id
// ("caption:battery", "caption:location", …). Recover that subtype so the
// renderer dispatches to the proper widget instead of the gradient/text
// fallback (which would otherwise print the raw SF-symbol name).
const SUBTYPE_ALIAS = { standard: "default" };
function resolveType(raw) {
  const id = raw.overlay_id ?? raw.id;
  if (typeof id === "string" && id.startsWith("caption:")) {
    const sub = id.slice("caption:".length);
    if (sub) return SUBTYPE_ALIAS[sub] ?? sub;
  }
  const t = raw.type;
  // Backend generic container types aren't real subtypes → treat as plain text.
  if (!t || t === "caption" || t === "static_content" || t === "standard") {
    return defaultOverlay.type;
  }
  return t;
}

// Resolve the two gradient stops from whichever producer shape arrived:
//   flat → color_top/color_bottom (or web's top/color_bot aliases)
//   feed → background.colors[0..1]
function resolveGradient(raw) {
  const colors = Array.isArray(raw.background?.colors) ? raw.background.colors : null;
  const top = raw.color_top ?? raw.top ?? (colors ? colors[0] : "") ?? "";
  const bottom =
    raw.color_bottom ?? raw.color_bot ?? (colors ? (colors[1] ?? colors[0]) : "") ?? "";
  return { top: top || "", bottom: bottom || "" };
}

/**
 * Fold any producer shape into the canonical flat overlay object.
 * @param {object} [raw] - preset, flat optionsData, or merged moment.overlays
 * @returns {typeof defaultOverlay & Record<string, any>}
 */
export function normalizeOverlay(raw) {
  if (!raw || typeof raw !== "object") return { ...defaultOverlay };

  const { top, bottom } = resolveGradient(raw);

  const overlay = {
    ...defaultOverlay,
    // overlay_id doubles as the picker's selection/toggle key, so it must stay
    // unique across id-less presets — fall back through caption/order_index
    // (mirrors the old normalizeTheme) before the shared "standard" default.
    overlay_id:
      raw.overlay_id ??
      raw.preset_id ??
      raw.id ??
      raw.caption ??
      (raw.order_index != null ? `idx-${raw.order_index}` : defaultOverlay.overlay_id),
    type: resolveType(raw),
    color_top: top,
    color_bottom: bottom,
    text_color:
      raw.text_color ?? raw.color_text ?? raw.textColor ?? defaultOverlay.text_color,
    icon: normalizeIcon(raw.icon),
    caption: raw.caption ?? raw.text ?? raw.preset_caption ?? "",
  };

  // Per-type extras carried straight through for the live/music/review renderers.
  if (raw.weatherData) overlay.weatherData = raw.weatherData;
  if (raw.payload) overlay.payload = raw.payload;
  if (raw.music) overlay.music = raw.music;

  return overlay;
}

/**
 * Project a canonical overlay down to exactly the fields the post payload
 * (`optionsData`) consumes — see payload-services.createRequestPayloadV5. This
 * is what the compose send path forwards as `overlayData`, replacing the old
 * `{ sticker }` shape the backend never read. Strips any transient UI fields
 * (e.g. a preset's `_raw`) so they never ride onto the wire.
 * @param {object|null} overlay
 * @returns {object}
 */
export function toOverlayData(overlay) {
  if (!overlay || typeof overlay !== "object") return {};
  const { overlay_id, type, color_top, color_bottom, text_color, icon, caption } = overlay;
  const data = { overlay_id, type, color_top, color_bottom, text_color, icon, caption };
  if (overlay.weatherData) data.weatherData = overlay.weatherData;
  if (overlay.payload) data.payload = overlay.payload;
  if (overlay.music) data.music = overlay.music;
  return data;
}
