// Tests for computePollCounts — the pure helper that aggregates reactions into
// poll vote totals. Isolated from the React tree so it runs fast without mocks.
import { describe, it, expect } from "vitest";
import { computePollCounts } from "../feed-screen";

describe("computePollCounts", () => {
  it("returns isPoll:false when overlays payload is absent", () => {
    const result = computePollCounts({ reactions: [], overlays: null });
    expect(result.isPoll).toBe(false);
  });

  it("returns isPoll:false when moment has no poll payload", () => {
    const result = computePollCounts({
      reactions: [{ emoji: "❤️" }],
      overlays: { payload: null },
    });
    expect(result.isPoll).toBe(false);
  });

  it("counts left and right votes from reactions array", () => {
    const moment = {
      reactions: [
        { emoji: "👍" },
        { emoji: "👍" },
        { emoji: "👎" },
      ],
      overlays: {
        payload: { left_emoji: "👍", right_emoji: "👎" },
      },
    };
    const result = computePollCounts(moment);
    expect(result.isPoll).toBe(true);
    expect(result.leftCount).toBe(2);
    expect(result.rightCount).toBe(1);
    expect(result.leftEmoji).toBe("👍");
    expect(result.rightEmoji).toBe("👎");
  });

  it("handles empty reactions gracefully", () => {
    const result = computePollCounts({
      reactions: [],
      overlays: { payload: { left_emoji: "🔥", right_emoji: "❄️" } },
    });
    expect(result.isPoll).toBe(true);
    expect(result.leftCount).toBe(0);
    expect(result.rightCount).toBe(0);
  });

  it("handles undefined reactions gracefully", () => {
    const result = computePollCounts({
      overlays: { payload: { left_emoji: "🔥", right_emoji: "❄️" } },
    });
    expect(result.isPoll).toBe(true);
    expect(result.leftCount).toBe(0);
    expect(result.rightCount).toBe(0);
  });

  it("ignores reactions that don't match left or right emoji", () => {
    const moment = {
      reactions: [
        { emoji: "👍" },
        { emoji: "❤️" }, // not a poll choice — counted separately
        { emoji: "👎" },
      ],
      overlays: { payload: { left_emoji: "👍", right_emoji: "👎" } },
    };
    const result = computePollCounts(moment);
    expect(result.leftCount).toBe(1);
    expect(result.rightCount).toBe(1);
  });
});
