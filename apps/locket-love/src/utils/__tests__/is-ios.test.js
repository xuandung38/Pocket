// Tests for isIOS() / isAndroid() platform detection utilities.
// Strategy: stub navigator properties via Object.defineProperty (jsdom allows this).
// No real device required — we validate the detection logic, not the browser runtime.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We import AFTER mocking so the module sees the stubbed globals.
let isIOS;
let isAndroid;

// Helper to override navigator properties safely in jsdom.
function stubNavigator(overrides) {
  const originalUA = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalMaxTouch = navigator.maxTouchPoints;

  if (overrides.userAgent !== undefined) {
    Object.defineProperty(navigator, "userAgent", {
      value: overrides.userAgent,
      configurable: true,
    });
  }
  if (overrides.platform !== undefined) {
    Object.defineProperty(navigator, "platform", {
      value: overrides.platform,
      configurable: true,
    });
  }
  if (overrides.maxTouchPoints !== undefined) {
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: overrides.maxTouchPoints,
      configurable: true,
    });
  }

  return () => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUA,
      configurable: true,
    });
    Object.defineProperty(navigator, "platform", {
      value: originalPlatform,
      configurable: true,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: originalMaxTouch,
      configurable: true,
    });
  };
}

beforeEach(async () => {
  // Re-import fresh module each test so stubs take effect.
  vi.resetModules();
  const mod = await import("../is-ios.js");
  isIOS = mod.isIOS;
  isAndroid = mod.isAndroid;
});

describe("isIOS()", () => {
  it("returns true for iPhone UA", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isIOS()).toBe(true);
    restore();
  });

  it("returns true for iPad UA", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPad",
      maxTouchPoints: 5,
    });
    expect(isIOS()).toBe(true);
    restore();
  });

  it("returns true for iPadOS 13+ (MacIntel + maxTouchPoints > 1)", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });
    expect(isIOS()).toBe(true);
    restore();
  });

  it("returns false on desktop Mac (MacIntel, maxTouchPoints=0)", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    expect(isIOS()).toBe(false);
    restore();
  });

  it("returns false on Android", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });
    expect(isIOS()).toBe(false);
    restore();
  });

  it("returns false on Windows desktop", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "Win32",
      maxTouchPoints: 0,
    });
    expect(isIOS()).toBe(false);
    restore();
  });
});

describe("isAndroid()", () => {
  it("returns true for Android UA", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });
    expect(isAndroid()).toBe(true);
    restore();
  });

  it("returns false on iPhone", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isAndroid()).toBe(false);
    restore();
  });

  it("returns false on desktop", () => {
    const restore = stubNavigator({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      platform: "Win32",
      maxTouchPoints: 0,
    });
    expect(isAndroid()).toBe(false);
    restore();
  });
});
