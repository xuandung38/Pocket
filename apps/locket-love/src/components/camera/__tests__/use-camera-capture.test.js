// Tests for useCameraCapture hook.
// jsdom has no MediaRecorder / getUserMedia — we mock both fully.
// We test the DECISION LOGIC: tap→photo, hold→video, 10s cap, mime selection.
// Real stream/codec behaviour is deferred to Phase 7 manual device QA.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Flush all microtasks + setTimeout callbacks so async toBlob callbacks resolve.
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

// ── Fake MediaRecorder ────────────────────────────────────────────────────────
class FakeMediaRecorder {
  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.state = "inactive";
    this.ondataavailable = null;
    this.onstop = null;
    FakeMediaRecorder._instances.push(this);
  }
  start() {
    this.state = "recording";
    // Immediately fire a dataavailable chunk so onstop has something to work with.
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(["v"], { type: "video/webm" }) });
    }
  }
  stop() {
    this.state = "inactive";
    if (this.onstop) this.onstop();
  }
  static isTypeSupported(mime) {
    return mime === "video/webm;codecs=vp9,opus" || mime === "video/webm";
  }
  static _instances = [];
  static _reset() {
    FakeMediaRecorder._instances = [];
  }
}

// ── Fake stream + track ───────────────────────────────────────────────────────
const makeFakeStream = (caps = {}) => {
  const track = {
    stop: vi.fn(),
    getCapabilities: () => caps,
    applyConstraints: vi.fn(async () => {}),
  };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    _track: track,
  };
};

// ── Stub globals ──────────────────────────────────────────────────────────────
function stubGlobals(caps = {}) {
  const fakeStream = makeFakeStream(caps);
  global.MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn(async () => fakeStream) },
    configurable: true,
    writable: true,
  });
  // canvas.toBlob and getContext are not implemented in jsdom — stub both via
  // spyOn so they are properly restored by vi.restoreAllMocks() in afterEach.
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    function (cb, type) {
      // Invoke synchronously so fake timers don't interfere with the callback.
      cb(new Blob(["img"], { type: type || "image/jpeg" }));
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
    translate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  }));
  global.URL.createObjectURL = vi.fn(() => "blob:fake-url");
  global.URL.revokeObjectURL = vi.fn();
  return fakeStream;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const VIDEO_HOLD_MS = 350;
const MAX_VIDEO_MS = 10_000;

beforeEach(() => {
  vi.useFakeTimers();
  FakeMediaRecorder._reset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("useCameraCapture", () => {
  async function setup(caps = {}) {
    const fakeStream = stubGlobals(caps);
    vi.resetModules();
    const { useCameraCapture } = await import("../use-camera-capture.js");

    const streamRef = { current: fakeStream };
    // capturePhoto calls document.createElement("canvas") — the real jsdom canvas.
    // We stub toBlob on the prototype (in stubGlobals), so we just need videoRef
    // to report a non-zero size so the early-return guard passes.
    const videoRef = {
      current: {
        videoWidth: 640,
        videoHeight: 480,
      },
    };
    const setShot = vi.fn();
    const setPhase = vi.fn();

    const { result } = renderHook(() =>
      useCameraCapture({ streamRef, videoRef, setShot, setPhase, facingMode: "user" }),
    );

    return { result, setShot, setPhase, streamRef, videoRef, fakeStream };
  }

  describe("tap → photo", () => {
    it("calls setShot with image and setPhase('captured') on quick tap", async () => {
      const { result, setShot, setPhase } = await setup();

      act(() => {
        result.current.handleCaptureDown();
      });
      // Release before VIDEO_HOLD_MS threshold
      act(() => {
        vi.advanceTimersByTime(100);
        result.current.handleCaptureUp();
      });

      expect(setShot).toHaveBeenCalledWith(
        expect.objectContaining({ type: "image" }),
      );
      expect(setPhase).toHaveBeenCalledWith("captured");
    });
  });

  describe("hold → video", () => {
    it("starts MediaRecorder after hold exceeds VIDEO_HOLD_MS", async () => {
      const { result } = await setup();

      act(() => {
        result.current.handleCaptureDown();
        vi.advanceTimersByTime(VIDEO_HOLD_MS + 10);
      });

      expect(FakeMediaRecorder._instances).toHaveLength(1);
      expect(FakeMediaRecorder._instances[0].state).toBe("recording");
    });

    it("toggles isRecording true while recording, false after stop", async () => {
      const { result } = await setup();

      expect(result.current.isRecording).toBe(false);

      act(() => {
        result.current.handleCaptureDown();
        vi.advanceTimersByTime(VIDEO_HOLD_MS + 10);
      });
      expect(result.current.isRecording).toBe(true);

      act(() => {
        result.current.handleCaptureUp();
      });
      expect(result.current.isRecording).toBe(false);
    });

    it("stops recorder and calls setShot with video on pointer-up", async () => {
      const { result, setShot, setPhase } = await setup();

      act(() => {
        result.current.handleCaptureDown();
        vi.advanceTimersByTime(VIDEO_HOLD_MS + 10);
      });

      act(() => {
        result.current.handleCaptureUp();
      });

      expect(setShot).toHaveBeenCalledWith(
        expect.objectContaining({ type: "video" }),
      );
      expect(setPhase).toHaveBeenCalledWith("captured");
    });
  });

  describe("MAX_VIDEO_MS cap", () => {
    it("auto-stops recorder after 10 seconds", async () => {
      const { result, setShot } = await setup();

      act(() => {
        result.current.handleCaptureDown();
        vi.advanceTimersByTime(VIDEO_HOLD_MS + 10);
      });

      // Advance past the hard cap without releasing.
      act(() => {
        vi.advanceTimersByTime(MAX_VIDEO_MS + 100);
      });

      expect(setShot).toHaveBeenCalledWith(
        expect.objectContaining({ type: "video" }),
      );
    });
  });

  describe("mime type selection", () => {
    it("uses the first supported mime from the fallback chain", async () => {
      const { result } = await setup();

      act(() => {
        result.current.handleCaptureDown();
        vi.advanceTimersByTime(VIDEO_HOLD_MS + 10);
      });

      const recorder = FakeMediaRecorder._instances[0];
      // FakeMediaRecorder supports vp9 — it should be selected.
      expect(recorder.options?.mimeType).toBe("video/webm;codecs=vp9,opus");
    });
  });

  describe("torch helpers", () => {
    it("exposes torchSupported as false when caps.torch is absent", async () => {
      const { result } = await setup({});
      expect(result.current.torchSupported).toBe(false);
    });
  });

  describe("capturePhoto mirrors selfie (facingMode=user)", () => {
    it("calls setShot with image type", async () => {
      const { result, setShot } = await setup();

      act(() => {
        result.current.capturePhoto();
      });

      expect(setShot).toHaveBeenCalledWith(
        expect.objectContaining({ type: "image" }),
      );
    });
  });
});
