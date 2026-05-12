import { create } from "zustand";
import { GetAllMoments } from "@/services";
import { MOMENTS_CONFIG } from "@/config/configAlias";
import {
  bulkAddMoments,
  deleteMomentById,
  getAllMoments,
  getMomentsByUser,
} from "@/cache/momentDB";
import { SonnerError } from "@/components/ui/SonnerToast";

const { initialVisible, loadMoreLimit } = MOMENTS_CONFIG;

/* --------------------------------------------------
 * Default bucket
 * -------------------------------------------------- */
const defaultBucket = () => ({
  items: [],
  loading: false,
  hasMore: true,
  isLoadingMore: false,
  visibleCount: initialVisible,
  // syncToken: BE-provided cursor for next page; null means no more pages.
  syncToken: null,
});

/* --------------------------------------------------
 * Store
 * -------------------------------------------------- */
export const useMomentsStoreV2 = create((set, get) => ({
  momentsByUser: {},

  /* --------------------------------------------------
   * 🔧 Ensure bucket (SAFE – no race condition)
   * -------------------------------------------------- */
  ensureBucket: (key) => {
    set((state) => {
      if (state.momentsByUser[key]) return state;
      return {
        momentsByUser: {
          ...state.momentsByUser,
          [key]: defaultBucket(),
        },
      };
    });
  },

  /* --------------------------------------------------
   * 1️⃣ Fetch initial (Local → API)
   * -------------------------------------------------- */
  fetchMoments: async (user, selectedFriendUid = null) => {
    if (!user) return;

    const key = selectedFriendUid ?? "all";
    get().ensureBucket(key);

    // loading = true
    set((state) => {
      const bucket = state.momentsByUser[key] ?? defaultBucket();
      return {
        momentsByUser: {
          ...state.momentsByUser,
          [key]: {
            ...bucket,
            loading: true,
            hasMore: true,
            visibleCount: initialVisible,
          },
        },
      };
    });

    try {
      /* ---------- Local DB ---------- */
      const localData = selectedFriendUid
        ? await getMomentsByUser(selectedFriendUid)
        : await getAllMoments();

      if (localData?.length) {
        set((state) => {
          const bucket = state.momentsByUser[key] ?? defaultBucket();
          return {
            momentsByUser: {
              ...state.momentsByUser,
              [key]: {
                ...bucket,
                items: [...localData].sort(
                  (a, b) => b.createTime - a.createTime
                ),
              },
            },
          };
        });
      }

      /* ---------- API sync ---------- */
      const { items: apiData, syncToken } = await GetAllMoments({
        friendId: selectedFriendUid,
        limit: initialVisible,
      });

      // Always persist syncToken + hasMore even when items empty, so pagination
      // state is correct (e.g. account has zero moments → hasMore=false).
      set((state) => {
        const bucket = state.momentsByUser[key] ?? defaultBucket();
        const nextItems = apiData?.length
          ? [...apiData].sort((a, b) => b.createTime - a.createTime)
          : bucket.items;
        return {
          momentsByUser: {
            ...state.momentsByUser,
            [key]: {
              ...bucket,
              items: nextItems,
              syncToken,
              hasMore: !!syncToken,
            },
          },
        };
      });

      if (apiData?.length) {
        // cache lại local
        await bulkAddMoments(apiData);
      }
    } catch (err) {
      console.error("❌ fetchMoments error:", err);
      SonnerError("Không tải được moments", err?.message || "");
    } finally {
      set((state) => {
        const bucket = state.momentsByUser[key];
        if (!bucket) return state;
        return {
          momentsByUser: {
            ...state.momentsByUser,
            [key]: {
              ...bucket,
              loading: false,
            },
          },
        };
      });
    }
  },

  reloadMoments: async (selectedFriendUid = null) => {
    const key = selectedFriendUid ?? "all";
    get().ensureBucket(key);

    // loading = true
    set((state) => {
      const bucket = state.momentsByUser[key] ?? defaultBucket();
      return {
        momentsByUser: {
          ...state.momentsByUser,
          [key]: {
            ...bucket,
            loading: true,
            hasMore: true,
            visibleCount: initialVisible,
          },
        },
      };
    });

    try {
      /* ---------- Local DB ---------- */
      const localData = selectedFriendUid
        ? await getMomentsByUser(selectedFriendUid)
        : await getAllMoments();

      if (localData?.length) {
        set((state) => {
          const bucket = state.momentsByUser[key] ?? defaultBucket();
          return {
            momentsByUser: {
              ...state.momentsByUser,
              [key]: {
                ...bucket,
                items: [...localData].sort(
                  (a, b) => b.createTime - a.createTime
                ),
              },
            },
          };
        });
      }

      /* ---------- API sync ---------- */
      const { items: apiData, syncToken } = await GetAllMoments({
        friendId: selectedFriendUid,
        limit: initialVisible,
      });

      // reloadMoments replaces page-1 view; reset syncToken + hasMore from BE.
      set((state) => {
        const bucket = state.momentsByUser[key] ?? defaultBucket();
        const nextItems = apiData?.length
          ? [...apiData].sort((a, b) => b.createTime - a.createTime)
          : bucket.items;
        return {
          momentsByUser: {
            ...state.momentsByUser,
            [key]: {
              ...bucket,
              items: nextItems,
              syncToken,
              hasMore: !!syncToken,
            },
          },
        };
      });

      if (apiData?.length) {
        // cache lại local
        await bulkAddMoments(apiData);
      }
    } catch (err) {
      console.error("❌ reloadMoments error:", err);
    } finally {
      set((state) => {
        const bucket = state.momentsByUser[key];
        if (!bucket) return state;
        return {
          momentsByUser: {
            ...state.momentsByUser,
            [key]: {
              ...bucket,
              loading: false,
            },
          },
        };
      });
    }
  },

  /* --------------------------------------------------
   * 2️⃣ Load more older
   * -------------------------------------------------- */
  loadMoreOlder: async (selectedFriendUid = null) => {
    const key = selectedFriendUid ?? "all";
    const bucket = get().momentsByUser[key];
    if (!bucket) return;

    // `loading` guard: avoids a race where local-cache hydrate populated
    // items but initial API fetch hasn't yet returned a `syncToken`. Without
    // this, loadMore would observe syncToken=null and incorrectly flip
    // hasMore=false before we ever paginate.
    if (
      bucket.loading ||
      bucket.isLoadingMore ||
      !bucket.hasMore ||
      !bucket.items.length
    ) {
      return;
    }

    // set loading more
    set((state) => {
      const b = state.momentsByUser[key];
      if (!b) return state;
      return {
        momentsByUser: {
          ...state.momentsByUser,
          [key]: {
            ...b,
            isLoadingMore: true,
          },
        },
      };
    });

    try {
      // No cursor → BE has signalled there's no next page. Flip hasMore=false
      // (defensively; the early-return guard above should already catch this).
      if (!bucket.syncToken) {
        set((state) => {
          const b = state.momentsByUser[key];
          if (!b) return state;
          return {
            momentsByUser: {
              ...state.momentsByUser,
              [key]: { ...b, hasMore: false },
            },
          };
        });
        return;
      }

      const { items: older, syncToken: nextToken } = await GetAllMoments({
        friendId: selectedFriendUid,
        limit: loadMoreLimit,
        syncToken: bucket.syncToken,
      });

      // Always advance cursor + hasMore from BE response, even on empty page.
      set((state) => {
        const b = state.momentsByUser[key];
        if (!b) return state;

        const existingIds = new Set(b.items.map((i) => i.id));
        const filtered = (older ?? []).filter((m) => !existingIds.has(m.id));

        return {
          momentsByUser: {
            ...state.momentsByUser,
            [key]: {
              ...b,
              items: filtered.length ? [...b.items, ...filtered] : b.items,
              syncToken: nextToken,
              hasMore: !!nextToken,
            },
          },
        };
      });

      if (older?.length) {
        await bulkAddMoments(older);
      }
    } catch (err) {
      console.error("❌ loadMoreOlder error:", err);
    } finally {
      set((state) => {
        const b = state.momentsByUser[key];
        if (!b) return state;
        return {
          momentsByUser: {
            ...state.momentsByUser,
            [key]: {
              ...b,
              isLoadingMore: false,
            },
          },
        };
      });
    }
  },

  /* --------------------------------------------------
   * 3️⃣ Realtime add moment (Socket)
   * -------------------------------------------------- */
  addNewMoment: async (payload) => {
    const items = Array.isArray(payload) ? payload : [payload];
    if (!items.length) return;

    const dbQueue = [];

    set((state) => {
      const next = { ...state.momentsByUser };

      for (const m of items) {
        if (!m?.id) continue;

        const ownerUid = m.userUid || m.user || m.owner;
        const keys = [ownerUid ?? "all", "all"]; // 👈 add vào feed + all

        for (const key of keys) {
          if (!key) continue;

          const bucket = next[key] ?? defaultBucket();

          // ❌ duplicate
          if (bucket.items.some((i) => i.id === m.id)) continue;

          next[key] = {
            ...bucket,
            items: [m, ...bucket.items].sort(
              (a, b) => b.createTime - a.createTime
            ),
          };
        }

        dbQueue.push(m);
      }

      return { momentsByUser: next };
    });

    if (dbQueue.length) {
      await bulkAddMoments(dbQueue);
    }
  },

  syncMomentsSnapshot: async (snapshot) => {
    if (!Array.isArray(snapshot)) return;

    const snapshotIds = new Set(snapshot.map((m) => m.id));

    /* ---------- Update STORE ---------- */
    set((state) => {
      const next = { ...state.momentsByUser };

      const bucket = next["all"] ?? defaultBucket();

      next["all"] = {
        ...bucket,
        items: bucket.items.filter((m) => snapshotIds.has(m.id)),
      };

      return { momentsByUser: next };
    });

    /* ---------- Update IndexedDB ---------- */
    const local = await getAllMoments();
    const localIds = new Set(local.map((m) => m.id));

    const deletedIds = [...localIds].filter((id) => !snapshotIds.has(id));

    if (deletedIds.length) {
      await Promise.all(deletedIds.map(deleteMomentById));
    }

    await bulkAddMoments(snapshot);
  },

  /* --------------------------------------------------
   * 4️⃣ Remove moment
   * -------------------------------------------------- */
  removeMoment: async (momentId, ownerUid = null) => {
    const key = ownerUid ?? "all";
    const bucket = get().momentsByUser[key];
    if (!bucket) return;

    set((state) => ({
      momentsByUser: {
        ...state.momentsByUser,
        [key]: {
          ...bucket,
          items: bucket.items.filter((m) => m.id !== momentId),
        },
      },
    }));

    await deleteMomentById(momentId);
  },

  /* --------------------------------------------------
   * 5️⃣ Visible count
   * -------------------------------------------------- */
  increaseVisibleCount: (selectedFriendUid = null) => {
    const key = selectedFriendUid ?? "all";
    const bucket = get().momentsByUser[key];
    if (!bucket) return;

    if (bucket.visibleCount < bucket.items.length) {
      set((state) => ({
        momentsByUser: {
          ...state.momentsByUser,
          [key]: {
            ...bucket,
            visibleCount: Math.min(
              bucket.visibleCount + initialVisible,
              bucket.items.length
            ),
          },
        },
      }));
    }
  },

  resetVisible: (selectedFriendUid = null) => {
    const key = selectedFriendUid ?? "all";
    const bucket = get().momentsByUser[key];
    if (!bucket) return;

    set((state) => ({
      momentsByUser: {
        ...state.momentsByUser,
        [key]: {
          ...bucket,
          visibleCount: initialVisible,
        },
      },
    }));
  },
}));
