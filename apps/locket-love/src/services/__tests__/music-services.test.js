import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/libs", () => ({ api: { post } }));
vi.mock("@/config", () => ({ CONFIG: { api: { baseUrl: "https://host" } } }));

import { getInfoMusicByUrl } from "../music-services";

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({
    data: { status: "success", data: { title: "Song", artist: "Artist", image: "https://img", platform: "spotify" } },
  });
});

describe("getInfoMusicByUrl", () => {
  it("POSTs to /api/getInfoMusic with { url, platform } and returns the data", async () => {
    const out = await getInfoMusicByUrl("https://open.spotify.com/track/x", "spotify");
    expect(post).toHaveBeenCalledWith("https://host/api/getInfoMusic", {
      url: "https://open.spotify.com/track/x",
      platform: "spotify",
    });
    expect(out).toMatchObject({ title: "Song", platform: "spotify" });
  });

  it("returns null when the backend response has no data", async () => {
    post.mockResolvedValueOnce({ data: {} });
    expect(await getInfoMusicByUrl("x")).toBeNull();
  });
});
