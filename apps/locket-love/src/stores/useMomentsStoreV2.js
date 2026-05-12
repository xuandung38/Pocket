// useMomentsStoreV2
// In-memory moment feed store. Phase 3 scope is read-path + realtime add/remove;
// Phase 5 wires uploads through addMoment() optimistically.
//
// State surface (matches team-lead spec):
//   moments     : { [momentId]: Moment }   map keyed by moment.id (dedupe-friendly)
//   syncToken   : string | null            BE cursor for next pagination page
//   hasMore     : boolean                  true while more pages exist
//   loading     : boolean                  initial-load network flag
//   isLoadingMore : boolean                pagination network flag
//
// Actions:
//   loadInitial({ friendId })   - first-page fetch, replaces feed
//   loadMoreOlder({ friendId }) - paginate via syncToken
//   addMoment(moment|moments)   - realtime insert (e.g. socket / own post)
//   deleteMoment(id)            - call BE then remove from store
//   removeMomentLocal(id)       - drop without API call (used for optimistic rollback)
//   clear()                     - reset to defaults (logout / friend switch)
//
// `moments` is a map (not an array) to make dedupe O(1) on realtime adds.
// Consumers should derive sorted arrays via the `selectMomentsArray` helper below.

import { create } from "zustand";
import { getAllMoments, deleteMoment as svcDeleteMoment } from "@/services/LocketServices/moment.services";
import { MOMENTS_CONFIG } from "@/config";

const { initialVisible = 50, loadMoreLimit = 50 } = MOMENTS_CONFIG ?? {};

// Convert an array of moments into a uid-keyed map. Dedup-friendly.
function indexById(list) {
  const out = {};
  for (const m of list ?? []) {
    if (m?.id) out[m.id] = m;
  }
  return out;
}

export const useMomentsStoreV2 = create((set, get) => ({
  moments: {},
  syncToken: null,
  hasMore: true,
  loading: false,
  isLoadingMore: false,

  // --------------------------------------------------------------------
  // First-page fetch. Replaces any existing feed so consumers see a clean
  // initial render. Stores the BE-provided syncToken cursor for pagination.
  // --------------------------------------------------------------------
  loadInitial: async ({ friendId = null, limit = initialVisible } = {}) => {
    set({ loading: true, hasMore: true });
    try {
      const { items, syncToken } = await getAllMoments({ friendId, limit });
      set({
        moments: indexById(items),
        syncToken,
        hasMore: !!syncToken,
      });
    } catch (err) {
      console.error("[useMomentsStoreV2] loadInitial failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  // --------------------------------------------------------------------
  // Paginate older moments via syncToken cursor.
  // Guards:
  //   - bail if already paginating
  //   - bail if no more pages (`hasMore=false` or `syncToken=null`)
  //   - bail if we haven't loaded the first page yet (avoids accidental
  //     loadMore before initial fetch returns its cursor)
  // --------------------------------------------------------------------
  loadMoreOlder: async ({ friendId = null, limit = loadMoreLimit } = {}) => {
    const { loading, isLoadingMore, hasMore, syncToken, moments } = get();
    if (loading || isLoadingMore) return;
    if (!hasMore || !syncToken) return;
    if (Object.keys(moments).length === 0) return;

    set({ isLoadingMore: true });
    try {
      const { items, syncToken: next } = await getAllMoments({
        friendId,
        limit,
        syncToken,
      });

      set((state) => {
        const merged = { ...state.moments };
        for (const m of items ?? []) {
          if (m?.id && !merged[m.id]) merged[m.id] = m;
        }
        return {
          moments: merged,
          syncToken: next,
          hasMore: !!next,
        };
      });
    } catch (err) {
      console.error("[useMomentsStoreV2] loadMoreOlder failed:", err);
    } finally {
      set({ isLoadingMore: false });
    }
  },

  // --------------------------------------------------------------------
  // Realtime / optimistic insert. Accepts a single moment or an array.
  // Existing entries with the same id are replaced (BE-source-of-truth wins).
  // --------------------------------------------------------------------
  addMoment: (payload) => {
    const items = Array.isArray(payload) ? payload : [payload];
    if (!items.length) return;
    set((state) => {
      const next = { ...state.moments };
      for (const m of items) {
        if (m?.id) next[m.id] = m;
      }
      return { moments: next };
    });
  },

  // --------------------------------------------------------------------
  // Delete a moment server-side, then remove from store.
  // Returns the deleted id on success, null on failure (store unchanged).
  // --------------------------------------------------------------------
  deleteMoment: async (momentId) => {
    if (!momentId) return null;
    const moment = get().moments[momentId];
    const ownerUid = moment?.user || moment?.owner || moment?.userUid;

    const deletedId = await svcDeleteMoment(momentId, ownerUid);
    if (!deletedId) return null;

    set((state) => {
      const { [momentId]: _drop, ...rest } = state.moments;
      return { moments: rest };
    });
    return deletedId;
  },

  // Drop a moment from store without an API call (rollback / soft-hide).
  removeMomentLocal: (momentId) => {
    if (!momentId) return;
    set((state) => {
      const { [momentId]: _drop, ...rest } = state.moments;
      return { moments: rest };
    });
  },

  // Reset — used on logout or when switching feed scope.
  clear: () =>
    set({
      moments: {},
      syncToken: null,
      hasMore: true,
      loading: false,
      isLoadingMore: false,
    }),
}));

/**
 * Convenience selector — returns the moments map as a sorted array
 * (newest first by `createTime`, falling back to `date`).
 *
 * Use inside React components like:
 *   const list = useMomentsStoreV2(selectMomentsArray);
 */
export const selectMomentsArray = (state) =>
  Object.values(state.moments).sort(
    (a, b) => (b.createTime ?? b.date ?? 0) - (a.createTime ?? a.date ?? 0),
  );
