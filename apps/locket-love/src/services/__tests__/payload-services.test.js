// payload-services.test.js
// Covers the video_frame_url addition to createRequestPayloadV5.
// Dependencies (auth, network) are mocked so tests stay pure-unit.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/libs", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/utils", () => ({
  getToken: vi.fn(() => ({ localId: "user-123" })),
}));

vi.mock("@/components/ui/sonner-toast", () => ({
  SonnerWarning: vi.fn(),
}));

vi.mock("../storage-services", () => ({
  uploadFileAndGetInfoR2: vi.fn(async () => ({
    downloadURL: "https://r2.example.com/file.mp4",
    metadata: {
      path: "videos/user-123/file.mp4",
      name: "file.mp4",
      size: 1024 * 1024,
      uploadedAt: "2026-06-16T00:00:00.000Z",
    },
  })),
}));

// ── Tests ──────────────────────────────────────────────────────────────────

import { createRequestPayloadV5 } from "../payload-services";

const fakeFile = new File(["data"], "test.mp4", { type: "video/mp4" });

describe("createRequestPayloadV5 — video_frame_url (PNG frame)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT include video_frame_url when videoFrameUrl is absent", async () => {
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
    });
    expect(payload.options).not.toHaveProperty("video_frame_url");
  });

  it("does NOT include video_frame_url when videoFrameUrl is empty string", async () => {
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
      videoFrameUrl: "",
    });
    expect(payload.options).not.toHaveProperty("video_frame_url");
  });

  it("includes video_frame_url in options when videoFrameUrl is provided", async () => {
    const url = "https://api.example.com/frames/cherry.png";
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
      videoFrameUrl: url,
    });
    expect(payload.options.video_frame_url).toBe(url);
  });

  it("does not break existing image payloads (no video_frame_url by default)", async () => {
    const imgFile = new File(["data"], "test.jpg", { type: "image/jpeg" });
    const payload = await createRequestPayloadV5({
      mediaFile: imgFile,
      previewType: "image",
    });
    expect(payload.options).not.toHaveProperty("video_frame_url");
    expect(payload.contentType).toBe("image");
  });

  it("preserves existing overlay fields alongside video_frame_url", async () => {
    const url = "https://api.example.com/frames/star.png";
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
      caption: "Hello",
      videoFrameUrl: url,
      overlayData: { type: "custome", color_top: "#000", color_bottom: "#fff" },
    });
    expect(payload.options.video_frame_url).toBe(url);
    expect(payload.options.caption).toBe("Hello");
    expect(payload.options.color_top).toBe("#000");
  });
});

describe("createRequestPayloadV5 — video_frame_polaroid (polaroid frame)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT include video_frame_polaroid when videoFramePolaroid is absent", async () => {
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
    });
    expect(payload.options).not.toHaveProperty("video_frame_polaroid");
  });

  it("does NOT include video_frame_polaroid when videoFramePolaroid is undefined", async () => {
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
      videoFramePolaroid: undefined,
    });
    expect(payload.options).not.toHaveProperty("video_frame_polaroid");
  });

  it("includes video_frame_polaroid as JSON string when spec provided", async () => {
    const spec = { caption: "Xin chào", date: "16/06/2026" };
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
      videoFramePolaroid: spec,
    });
    expect(payload.options.video_frame_polaroid).toBe(JSON.stringify(spec));
  });

  it("parses back to original spec shape (round-trip)", async () => {
    const spec = { caption: "Test caption", date: "16/06/2026" };
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
      videoFramePolaroid: spec,
    });
    const parsed = JSON.parse(payload.options.video_frame_polaroid);
    expect(parsed).toEqual(spec);
  });

  it("does not include polaroid when png frame is used instead", async () => {
    const payload = await createRequestPayloadV5({
      mediaFile: fakeFile,
      previewType: "video",
      videoFrameUrl: "https://example.com/frame.png",
    });
    expect(payload.options).not.toHaveProperty("video_frame_polaroid");
    expect(payload.options.video_frame_url).toBeTruthy();
  });
});
