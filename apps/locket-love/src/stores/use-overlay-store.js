// use-overlay-store.js
// Caption overlay store. Fetches the Locket Dio v2 sectioned dataset from
// GET /v1/public/getAllOverlaysV2 (proxied by the self-hosted backend), caches
// in sessionStorage.
//
// Exposes TWO views of the same data so both new and legacy consumers work:
//   - `sections`: ordered [{ section_id, name, order_id, items: normalized[] }]
//                 → the caption-picker tiers render from this.
//   - `captionOverlays`: legacy type-keyed map (custome/decorative/...) derived
//                 for backward-compat (e.g. captured-send-preview quickCaptions).

import { create } from "zustand";
import { getAllOverlayCaption } from "@/services/overlay-services";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

const CACHE_KEY = "captionOverlaysV2";

// Map a v2 section_id onto a legacy captionOverlays key. Only the keys actually
// read downstream (captured-send-preview quickCaptions reads `.custome` +
// `.decorative`) are kept — other sections render via `sections`, not this map.
const SECTION_TO_LEGACY = {
  suggest: "custome",
  decorative: "decorative",
  decorative_by_locketdio: "decorative",
};

const EMPTY_LEGACY = {
  custome: [],
  decorative: [],
};

const byOrder = (a, b) => (a.order_id ?? a.order_index ?? 9999) - (b.order_id ?? b.order_index ?? 9999);

// Build both views from the raw upstream sections array.
function buildViews(rawSections) {
  const sections = [...rawSections]
    .filter((s) => s && s.active !== false)
    .sort(byOrder)
    .map((s) => ({
      section_id: s.section_id,
      name: s.name,
      order_id: s.order_id,
      items: (s.items || [])
        .filter((it) => it && it.active !== false)
        .sort(byOrder)
        .map(normalizeOverlay),
    }));

  const captionOverlays = { ...EMPTY_LEGACY };
  for (const s of sections) {
    const key = SECTION_TO_LEGACY[s.section_id];
    if (key) captionOverlays[key] = [...captionOverlays[key], ...s.items];
  }

  return { sections, captionOverlays };
}

export const useOverlayStore = create((set, get) => ({
  sections: [],
  captionOverlays: EMPTY_LEGACY,
  isLoading: false,

  fetchCaptionOverlays: async () => {
    // Already loaded — skip
    if (get().sections.length > 0) return;

    // sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.sections?.length) {
          set({ sections: parsed.sections, captionOverlays: parsed.captionOverlays });
          return;
        }
      }
    } catch {
      /* ignore parse errors — fall through to network */
    }

    set({ isLoading: true });
    try {
      const raw = await getAllOverlayCaption();
      if (!raw?.length) return;
      const views = buildViews(raw);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(views));
      } catch {
        /* quota exceeded — skip caching */
      }
      set(views);
    } catch (err) {
      console.error("[useOverlayStore] fetchCaptionOverlays failed:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  clearCaptionOverlays: () => {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
    set({ sections: [], captionOverlays: EMPTY_LEGACY });
  },
}));
