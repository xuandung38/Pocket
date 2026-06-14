// use-overlay-store.js
// Caption overlay themes store — mirrors web/lovekit useOverlayStore.
// Fetches from GET /v1/public/themes, groups by type, caches in sessionStorage.
// Self-hosted backend returns [] for now; full deployment returns real themes.

import { create } from "zustand";
import { getAllOverlayCaption } from "@/services/overlay-services";

const CACHE_KEY = "captionOverlays";

const sortByOrder = (list) =>
  [...list].sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));

function groupByType(themes) {
  return {
    decorative: sortByOrder(themes.filter((t) => t.type === "decorative")),
    custome: sortByOrder(themes.filter((t) => t.type === "custome")),
    background: sortByOrder(themes.filter((t) => t.type === "background")),
    image_icon: sortByOrder(themes.filter((t) => t.type === "image_icon")),
    image_gif: sortByOrder(themes.filter((t) => t.type === "image_gif")),
    special: sortByOrder(themes.filter((t) => t.type === "special")),
  };
}

const EMPTY = {
  decorative: [],
  custome: [],
  background: [],
  image_icon: [],
  image_gif: [],
  special: [],
};

export const useOverlayStore = create((set, get) => ({
  captionOverlays: EMPTY,
  isLoading: false,

  fetchCaptionOverlays: async () => {
    // Already loaded — skip
    if (get().captionOverlays.decorative.length > 0) return;

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        set({ captionOverlays: JSON.parse(cached) });
        return;
      }
    } catch {
      /* ignore parse errors — fall through to network */
    }

    set({ isLoading: true });
    try {
      const themes = await getAllOverlayCaption();
      if (!themes?.length) return;
      const grouped = groupByType(themes);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(grouped));
      } catch {
        /* quota exceeded — skip caching */
      }
      set({ captionOverlays: grouped });
    } catch (err) {
      console.error("[useOverlayStore] fetchCaptionOverlays failed:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  clearCaptionOverlays: () => {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
    set({ captionOverlays: EMPTY });
  },
}));
