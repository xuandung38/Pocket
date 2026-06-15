import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted — create the mock fn via vi.hoisted.
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/libs", () => ({ api: { post } }));

import { getLatestMoment } from "../moment-services";

beforeEach(() => post.mockReset());

describe("getLatestMoment", () => {
  it("POSTs to getLatestMomentV2 with fetch_streak and returns result", async () => {
    post.mockResolvedValue({
      data: { result: { streak: { count: 5, last_updated_yyyymmdd: "20260601" } } },
    });
    const out = await getLatestMoment();
    expect(post).toHaveBeenCalledWith(
      "/locket/proxy/getLatestMomentV2",
      expect.objectContaining({ data: expect.objectContaining({ fetch_streak: true }) }),
    );
    expect(out.streak).toEqual({ count: 5, last_updated_yyyymmdd: "20260601" });
  });

  it("returns null (best-effort) when the request throws", async () => {
    post.mockImplementationOnce(() => Promise.reject(new Error("network")));
    await expect(getLatestMoment()).resolves.toBeNull();
  });
});
