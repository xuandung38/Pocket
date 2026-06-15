// Tests for getAvailableCameras() — enumerate + classify videoinput devices.
// jsdom has no real mediaDevices; we mock navigator.mediaDevices entirely.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Fresh module per test (vi.resetModules below).
let getAvailableCameras;

// Build a fake MediaDeviceInfo-like object.
const fakeDevice = (label, kind = "videoinput", deviceId = label) => ({
  label,
  kind,
  deviceId,
  groupId: "",
});

// Stub navigator.mediaDevices with controllable enumerateDevices + getUserMedia.
function stubMediaDevices({ devices, labelsOnFirst = true }) {
  const devicesWithLabels = devices;
  const devicesWithoutLabels = devices.map((d) => ({ ...d, label: "" }));

  let callCount = 0;
  const enumerateDevices = vi.fn(async () => {
    callCount += 1;
    // First call returns no-label devices if labelsOnFirst is false.
    if (!labelsOnFirst && callCount === 1) return devicesWithoutLabels;
    return devicesWithLabels;
  });

  // Fake stream with a stop-able track.
  const fakeTrack = { stop: vi.fn() };
  const fakeStream = { getTracks: () => [fakeTrack] };
  const getUserMedia = vi.fn(async () => fakeStream);

  Object.defineProperty(navigator, "mediaDevices", {
    value: { enumerateDevices, getUserMedia },
    configurable: true,
    writable: true,
  });

  return { enumerateDevices, getUserMedia, fakeTrack };
}

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("../get-available-cameras.js");
  getAvailableCameras = mod.getAvailableCameras;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getAvailableCameras()", () => {
  describe("classification — front / back / ultrawide / zoom", () => {
    it("classifies front + back cameras from English labels", async () => {
      const devices = [
        fakeDevice("Front Camera", "videoinput", "front-id"),
        fakeDevice("Back Camera", "videoinput", "back-id"),
      ];
      stubMediaDevices({ devices, labelsOnFirst: true });

      const result = await getAvailableCameras();

      expect(result.frontCameras).toHaveLength(1);
      expect(result.frontCameras[0].deviceId).toBe("front-id");
      expect(result.backCameras).toHaveLength(1);
      expect(result.backCameras[0].deviceId).toBe("back-id");
    });

    it("classifies Vietnamese-label cameras (mặt trước / mặt sau)", async () => {
      const devices = [
        fakeDevice("Camera mặt trước", "videoinput", "vn-front"),
        fakeDevice("Camera mặt sau", "videoinput", "vn-back"),
      ];
      stubMediaDevices({ devices, labelsOnFirst: true });

      const result = await getAvailableCameras();

      expect(result.frontCameras[0].deviceId).toBe("vn-front");
      expect(result.backCameras[0].deviceId).toBe("vn-back");
    });

    it("identifies backUltraWideCamera from '0.5x' label", async () => {
      const devices = [
        fakeDevice("Front Camera", "videoinput", "front-id"),
        fakeDevice("Back Ultra Wide Camera 0.5x", "videoinput", "uw-id"),
        fakeDevice("Back Camera 1x", "videoinput", "normal-id"),
        fakeDevice("Back Telephoto Camera 2x", "videoinput", "zoom-id"),
      ];
      stubMediaDevices({ devices, labelsOnFirst: true });

      const result = await getAvailableCameras();

      expect(result.backUltraWideCamera?.deviceId).toBe("uw-id");
      expect(result.backNormalCamera?.deviceId).toBe("normal-id");
      expect(result.backZoomCamera?.deviceId).toBe("zoom-id");
    });

    it("sets backNormalCamera to first backCamera when no explicit normal label", async () => {
      const devices = [
        fakeDevice("Back Ultra Wide Camera 0.5x", "videoinput", "uw-id"),
        fakeDevice("Back Camera rear outer", "videoinput", "back-other"),
      ];
      stubMediaDevices({ devices, labelsOnFirst: true });

      const result = await getAvailableCameras();

      // backNormalCamera should fall back to backCameras[0]
      expect(result.backNormalCamera).not.toBeNull();
    });

    it("filters out non-videoinput kinds", async () => {
      const devices = [
        fakeDevice("Microphone", "audioinput", "mic-id"),
        fakeDevice("Back Camera", "videoinput", "back-id"),
        fakeDevice("Speaker", "audiooutput", "speaker-id"),
      ];
      stubMediaDevices({ devices, labelsOnFirst: true });

      const result = await getAvailableCameras();

      expect(result.allCameras).toHaveLength(1);
      expect(result.allCameras[0].deviceId).toBe("back-id");
    });
  });

  describe("fallback when no labels on first enumerate", () => {
    it("calls getUserMedia to request permission then re-enumerates", async () => {
      const devices = [
        fakeDevice("Front Camera", "videoinput", "front-id"),
        fakeDevice("Back Camera", "videoinput", "back-id"),
      ];
      const { enumerateDevices, getUserMedia, fakeTrack } = stubMediaDevices({
        devices,
        labelsOnFirst: false, // first call returns empty labels
      });

      const result = await getAvailableCameras();

      // Should have called getUserMedia to unlock labels.
      expect(getUserMedia).toHaveBeenCalledWith({ video: true });
      // Should have stopped the permission-probe tracks.
      expect(fakeTrack.stop).toHaveBeenCalled();
      // Should have called enumerateDevices twice.
      expect(enumerateDevices).toHaveBeenCalledTimes(2);
      // After re-enumerate, classification works.
      expect(result.frontCameras).toHaveLength(1);
    });
  });

  describe("fallback for unclassified devices", () => {
    it("uses remaining device as backCamera when no back-label match", async () => {
      const devices = [
        fakeDevice("Generic Camera A", "videoinput", "generic-a"),
        fakeDevice("Generic Camera B", "videoinput", "generic-b"),
      ];
      stubMediaDevices({ devices, labelsOnFirst: true });

      const result = await getAvailableCameras();

      // At least one of the unclassified cameras ends up as back.
      expect(result.backCameras.length).toBeGreaterThanOrEqual(1);
    });

    it("returns allCameras with every videoinput device", async () => {
      const devices = [
        fakeDevice("Front Camera", "videoinput", "front-id"),
        fakeDevice("Back Camera", "videoinput", "back-id"),
      ];
      stubMediaDevices({ devices, labelsOnFirst: true });

      const result = await getAvailableCameras();

      expect(result.allCameras).toHaveLength(2);
    });
  });
});
