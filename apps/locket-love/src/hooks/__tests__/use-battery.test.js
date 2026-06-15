// Tests for useBattery hook — verifies level/charging when API is present,
// and graceful null when the Battery Status API is absent (most desktop browsers).
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBattery } from "../use-battery";

describe("useBattery", () => {
  afterEach(() => {
    // Remove any Battery API mock so tests don't bleed into each other
    try {
      delete navigator.getBattery;
    } catch (_) {
      // Ignore — some strict environments make navigator read-only
    }
  });

  it("returns level as 0-100 int and charging bool when Battery API is available", async () => {
    const mockBattery = {
      level: 0.8,
      charging: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, "getBattery", {
      value: vi.fn().mockResolvedValue(mockBattery),
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useBattery());
    await act(async () => {});

    expect(result.current.level).toBe(80);
    expect(result.current.charging).toBe(true);
    expect(result.current.supported).toBe(true);
  });

  it("returns level null and supported false when getBattery is not available", () => {
    // jsdom does not define navigator.getBattery — simulates desktop browsers
    const { result } = renderHook(() => useBattery());
    expect(result.current.level).toBeNull();
    expect(result.current.supported).toBe(false);
  });
});
