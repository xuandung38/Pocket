// use-memories-store.js
// Memories (Kỷ niệm) data store — the current user's OWN moments grouped into a
// month calendar, plus the streak counter.
//
// Strategy: stale-while-revalidate over localStorage (mirrors lovekit's
// useStreakStore.syncStreak). loadMemories() hydrates the cached snapshot
// SYNCHRONOUSLY (instant first paint), then revalidates in the background and
// only commits a new state when the data actually changed — so reopening the
// tab is instant and silent unless there's something new.
//
// Scope: own moments only (friendId = meUid) in a recent window (~200), with
// loadMoreOlder() paginating older months on scroll-up. Only metadata is cached
// (never image blobs).

import { create } from "zustand";
import { getAllMoments, getLatestMoment } from "@/services/moment-services";
import { getToken } from "@/utils";

const CACHE_KEY = "memories";
const PAGE = 200; // recent window
const MORE = 50; // older-page size

function indexById(list) {
  const out = {};
  for (const m of list ?? []) if (m?.id) out[m.id] = m;
  return out;
}

// Stable signatures used to decide whether a revalidate actually changed
// anything (avoids churning the store reference on every silent refetch).
const idSetKey = (map) => Object.keys(map).sort().join(",");
const streakKey = (s) => (s ? `${s.count}:${s.last_updated_yyyymmdd}` : "");

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      moments: indexById(d.moments),
      streak: d.streak ?? null,
      syncToken: d.syncToken ?? null,
      hasMore: d.hasMore ?? true,
    };
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        moments: Object.values(state.moments),
        streak: state.streak,
        syncToken: state.syncToken,
        hasMore: state.hasMore,
        savedAt: Date.now(),
      }),
    );
  } catch {
    /* quota exceeded — keep in-memory only */
  }
}

export const useMemoriesStore = create((set, get) => ({
  moments: {},
  streak: null,
  loading: false,
  isRevalidating: false,
  hasMore: true,
  syncToken: null,

  // SWR: hydrate cache sync → revalidate in background → commit only if changed.
  loadMemories: async () => {
    const cached = loadCache();
    if (cached) {
      set({
        moments: cached.moments,
        streak: cached.streak,
        syncToken: cached.syncToken,
        hasMore: cached.hasMore,
      });
    } else {
      set({ loading: true });
    }

    if (get().isRevalidating) return;
    set({ isRevalidating: true });
    try {
      const meUid = getToken()?.localId ?? null;
      const [moRes, latest] = await Promise.all([
        getAllMoments({ friendId: meUid, limit: PAGE }),
        getLatestMoment(),
      ]);

      const prev = get();
      const hadMoments = Object.keys(prev.moments).length > 0;
      // MERGE the recent window into existing moments (never wholesale-replace):
      //  - a transient successful-but-empty response can't wipe the cache, and
      //  - older months loaded via loadMoreOlder survive a tab remount's refetch.
      const mergedMoments = { ...prev.moments, ...indexById(moRes.items) };
      const nextStreak = latest?.streak ?? prev.streak ?? null;
      const changed =
        idSetKey(mergedMoments) !== idSetKey(prev.moments) ||
        streakKey(nextStreak) !== streakKey(prev.streak);

      if (changed) {
        const next = { moments: mergedMoments, streak: nextStreak };
        // Only (re)seed the pagination cursor on the first load. Once the user
        // has paginated older, keep the existing cursor so we don't lose it.
        if (!hadMoments) {
          next.syncToken = moRes.syncToken;
          next.hasMore = !!moRes.syncToken;
        }
        set(next);
        persist({ ...get(), ...next });
      }
      // else: nothing visible changed → leave state (incl. cursor) untouched.
    } catch (err) {
      console.error("[useMemoriesStore] loadMemories failed:", err);
    } finally {
      set({ isRevalidating: false, loading: false });
    }
  },

  // Paginate older moments (scroll to the top of the calendar).
  loadMoreOlder: async () => {
    const { isRevalidating, hasMore, syncToken, moments } = get();
    if (isRevalidating || !hasMore || !syncToken) return;
    if (Object.keys(moments).length === 0) return;

    set({ isRevalidating: true });
    try {
      const meUid = getToken()?.localId ?? null;
      const { items, syncToken: next } = await getAllMoments({
        friendId: meUid,
        limit: MORE,
        syncToken,
      });
      set((state) => {
        const merged = { ...state.moments };
        for (const m of items ?? []) if (m?.id && !merged[m.id]) merged[m.id] = m;
        const ns = { moments: merged, syncToken: next, hasMore: !!next };
        persist({ ...state, ...ns });
        return ns;
      });
    } catch (err) {
      console.error("[useMemoriesStore] loadMoreOlder failed:", err);
    } finally {
      set({ isRevalidating: false });
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* noop */
    }
    set({
      moments: {},
      streak: null,
      loading: false,
      isRevalidating: false,
      hasMore: true,
      syncToken: null,
    });
  },
}));

// Wipe cached memories on logout — the auth store dispatches `lk:auth:reset`
// after clearing tokens (same convention as use-activity-store). Without this,
// account A's cached calendar + streak would hydrate for account B on the next
// login (cross-account data leak). Only attach in a browser context.
if (typeof window !== "undefined") {
  window.addEventListener("lk:auth:reset", () => {
    useMemoriesStore.getState().clear();
  });
}

// Timestamp resolution mirrors feed-screen.getMomentTimestampMs: numeric epoch
// (createTime), else ISO date string, else 0.
function momentTs(m) {
  const numeric = Number(m?.createTime ?? m?.create_time);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const fromDate = Date.parse(m?.date ?? "");
  if (Number.isFinite(fromDate)) return fromDate;
  const fromCreate = Date.parse(m?.createTime ?? "");
  return Number.isFinite(fromCreate) ? fromCreate : 0;
}

function momentDateKey(m) {
  const ts = momentTs(m);
  if (ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }
  // Fallback: a plain "YYYY-MM-DD…" string.
  const d = m?.date;
  return typeof d === "string" && d.length >= 10 ? d.slice(0, 10) : null;
}

// Group own moments into { "YYYY-MM-DD": [moment, …] }, newest-first per day.
// Use with useMemo in the screen (NOT directly as a zustand selector — it builds
// a new object each call, which would loop on Object.is equality).
export const selectMemoriesByDate = (state) => {
  const out = {};
  for (const m of Object.values(state.moments)) {
    const key = momentDateKey(m);
    if (!key) continue;
    (out[key] ??= []).push(m);
  }
  for (const k in out) out[k].sort((a, b) => momentTs(b) - momentTs(a));
  return out;
};
