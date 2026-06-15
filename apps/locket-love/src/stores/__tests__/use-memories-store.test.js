import { describe, it, expect, vi, beforeEach } from "vitest";

const { getAllMoments, getLatestMoment } = vi.hoisted(() => ({
  getAllMoments: vi.fn(),
  getLatestMoment: vi.fn(),
}));
vi.mock("@/services/moment-services", () => ({ getAllMoments, getLatestMoment }));
vi.mock("@/utils", () => ({ getToken: () => ({ localId: "me" }) }));

import { useMemoriesStore, selectMemoriesByDate } from "../use-memories-store";

const m = (id, date) => ({ id, date, thumbnailUrl: `u/${id}` });

beforeEach(() => {
  localStorage.clear();
  getAllMoments.mockReset();
  getLatestMoment.mockReset();
  useMemoriesStore.setState({
    moments: {}, streak: null, loading: false,
    isRevalidating: false, hasMore: true, syncToken: null,
  });
});

describe("selectMemoriesByDate", () => {
  it("groups own moments by local YYYY-MM-DD, newest first within a day", () => {
    // Build epochs from LOCAL date parts so the day buckets are timezone-stable
    // (matches feed-screen.getMomentDateKey which also uses local date).
    const ep = (y, mo, d, h) => ({ createTime: new Date(y, mo, d, h).getTime() });
    const state = {
      moments: {
        a: { id: "a", ...ep(2026, 4, 1, 8) }, // 2026-05-01 08:00 local
        b: { id: "b", ...ep(2026, 4, 1, 20) }, // 2026-05-01 20:00 local
        c: { id: "c", ...ep(2026, 4, 3, 10) }, // 2026-05-03 local
      },
    };
    const byDate = selectMemoriesByDate(state);
    expect(Object.keys(byDate).sort()).toEqual(["2026-05-01", "2026-05-03"]);
    expect(byDate["2026-05-01"].map((x) => x.id)).toEqual(["b", "a"]); // newer first
    expect(byDate["2026-05-03"].map((x) => x.id)).toEqual(["c"]);
  });
});

describe("useMemoriesStore.loadMemories (SWR)", () => {
  it("first load fetches own moments + streak and persists to localStorage", async () => {
    getAllMoments.mockResolvedValue({ items: [m("a", "2026-05-01")], syncToken: "tok" });
    getLatestMoment.mockResolvedValue({ streak: { count: 7, last_updated_yyyymmdd: "20260601" } });

    await useMemoriesStore.getState().loadMemories();

    expect(getAllMoments).toHaveBeenCalledWith({ friendId: "me", limit: 200 });
    const s = useMemoriesStore.getState();
    expect(s.moments.a).toBeTruthy();
    expect(s.streak.count).toBe(7);
    expect(s.syncToken).toBe("tok");
    expect(JSON.parse(localStorage.getItem("memories")).moments.length).toBe(1);
  });

  it("hydrates from cache synchronously before the network resolves", () => {
    localStorage.setItem(
      "memories",
      JSON.stringify({ moments: [m("cached", "2026-04-01")], streak: { count: 2 }, syncToken: null, hasMore: false }),
    );
    getAllMoments.mockResolvedValue({ items: [], syncToken: null });
    getLatestMoment.mockResolvedValue(null);

    useMemoriesStore.getState().loadMemories(); // not awaited
    // cache applied synchronously
    expect(useMemoriesStore.getState().moments.cached).toBeTruthy();
    expect(useMemoriesStore.getState().streak.count).toBe(2);
  });

  it("no-ops moments reference when the id-set is unchanged", async () => {
    useMemoriesStore.setState({ moments: { a: m("a", "2026-05-01") } });
    const before = useMemoriesStore.getState().moments;
    getAllMoments.mockResolvedValue({ items: [m("a", "2026-05-01")], syncToken: null });
    getLatestMoment.mockResolvedValue(null);

    await useMemoriesStore.getState().loadMemories();
    expect(useMemoriesStore.getState().moments).toBe(before); // same reference, no churn
  });

  it("does not wipe the cache on a transient empty response", async () => {
    useMemoriesStore.setState({ moments: { a: m("a", "2026-05-01") } });
    getAllMoments.mockResolvedValue({ items: [], syncToken: null }); // successful-but-empty
    getLatestMoment.mockResolvedValue(null);

    await useMemoriesStore.getState().loadMemories();
    expect(useMemoriesStore.getState().moments.a).toBeTruthy(); // kept, not wiped
  });

  it("merges the recent window into older moments without losing the cursor", async () => {
    // Simulate a state where the user already paginated older moments.
    useMemoriesStore.setState({
      moments: { old: m("old", "2026-01-01") },
      syncToken: "older-cursor",
      hasMore: true,
    });
    getAllMoments.mockResolvedValue({ items: [m("recent", "2026-05-01")], syncToken: "recent-cursor" });
    getLatestMoment.mockResolvedValue(null);

    await useMemoriesStore.getState().loadMemories();
    const s = useMemoriesStore.getState();
    expect(Object.keys(s.moments).sort()).toEqual(["old", "recent"]); // older preserved
    expect(s.syncToken).toBe("older-cursor"); // pagination cursor not reset
  });
});

describe("useMemoriesStore.loadMoreOlder", () => {
  it("merges older moments and keeps existing ones", async () => {
    useMemoriesStore.setState({ moments: { a: m("a", "2026-05-01") }, syncToken: "tok", hasMore: true });
    getAllMoments.mockResolvedValue({ items: [m("b", "2026-04-01")], syncToken: null });

    await useMemoriesStore.getState().loadMoreOlder();
    const s = useMemoriesStore.getState();
    expect(Object.keys(s.moments).sort()).toEqual(["a", "b"]);
    expect(s.hasMore).toBe(false);
  });

  it("bails when there is no syncToken", async () => {
    useMemoriesStore.setState({ moments: { a: m("a", "2026-05-01") }, syncToken: null, hasMore: true });
    await useMemoriesStore.getState().loadMoreOlder();
    expect(getAllMoments).not.toHaveBeenCalled();
  });
});

describe("useMemoriesStore.clear", () => {
  it("resets state and removes the cache", () => {
    localStorage.setItem("memories", JSON.stringify({ moments: [m("a", "2026-05-01")] }));
    useMemoriesStore.setState({ moments: { a: m("a", "2026-05-01") }, streak: { count: 1 } });
    useMemoriesStore.getState().clear();
    expect(Object.keys(useMemoriesStore.getState().moments)).toHaveLength(0);
    expect(localStorage.getItem("memories")).toBeNull();
  });
});
