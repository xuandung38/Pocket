// use-frame-store.js
// Photo-frame library store — mirrors use-overlay-store.js pattern exactly:
// fetch + sessionStorage cache + loading guard + add/remove helpers.
// All frames (built-in global + caller's custom) come from GET /api/frames.

import { create } from "zustand";
import { getFrames, uploadCustomFrame, deleteFrame } from "@/services/frame-services";

const CACHE_KEY = "frameLibrary";

export const useFrameStore = create((set, get) => ({
  frames: [],
  isLoading: false,

  /**
   * Load frames from cache or network. Guard: skips if already populated.
   */
  fetchFrames: async () => {
    // Already loaded — skip (same guard as useOverlayStore)
    if (get().frames.length > 0) return;

    // Check sessionStorage cache first; treat empty array as "not loaded" so a
    // network failure (or server returning []) doesn't permanently freeze the picker.
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ frames: parsed });
          return;
        }
      }
    } catch {
      /* ignore parse errors — fall through to network */
    }

    set({ isLoading: true });
    try {
      const frames = await getFrames();
      // Only cache a non-empty result; empty means the fetch may have failed or
      // the user has no frames yet — let the next mount retry the network.
      if (frames.length > 0) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(frames));
        } catch {
          /* quota exceeded — skip caching */
        }
      }
      set({ frames });
    } catch (err) {
      console.error("[useFrameStore] fetchFrames failed:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Upload a custom PNG frame, prepend it to the list, refresh cache.
   * Throws on validation failure or upload error so the UI can surface the message.
   *
   * @param {File} file
   * @returns {Promise<object>} the newly created frame
   */
  addCustomFrame: async (file) => {
    const frame = await uploadCustomFrame(file); // throws with Vietnamese message on error
    const next = [frame, ...get().frames];
    set({ frames: next });
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      /* quota exceeded — skip caching */
    }
    return frame;
  },

  /**
   * Delete a custom frame from BE and remove from local state + cache.
   * Throws on server error so the UI can surface feedback.
   *
   * @param {string} id
   */
  removeFrame: async (id) => {
    await deleteFrame(id); // throws on 403/404 — server enforces ownership
    const next = get().frames.filter((f) => f.id !== id);
    set({ frames: next });
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      /* quota exceeded — skip caching */
    }
  },

  /** Reset state and clear cache (e.g. on logout). */
  clearFrames: () => {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
    set({ frames: [] });
  },
}));
