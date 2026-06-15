// Tests for weather-services.js — verifies correct POST shape and response parsing.
// @/libs and @/config are mocked so no real network calls are made.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/libs", () => ({
  api: { post: vi.fn() },
}));

vi.mock("@/config", () => ({
  CONFIG: { api: { baseUrl: "http://test-api" } },
}));

import { api } from "@/libs";
import { getWeatherByCoords } from "../weather-services";

describe("getWeatherByCoords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POSTs to /api/weatherV2 with lat/lon and returns the current weather object", async () => {
    const mockCurrent = { temp_c_rounded: 23, icon: "//cdn.weather/icon.png", condition: "Sunny" };
    api.post.mockResolvedValue({
      data: { status: "success", data: { current: mockCurrent } },
    });

    const result = await getWeatherByCoords(10.78, 106.69);

    expect(api.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/weatherV2"),
      { lat: 10.78, lon: 106.69 },
    );
    expect(result.temp_c_rounded).toBe(23);
    expect(result.icon).toBe("//cdn.weather/icon.png");
  });

  it("returns null when the response data has no current field", async () => {
    api.post.mockResolvedValue({ data: { status: "success", data: {} } });
    expect(await getWeatherByCoords(0, 0)).toBeNull();
  });

  it("propagates network errors so the hook can surface them to the user", async () => {
    api.post.mockRejectedValue(new Error("Network error"));
    await expect(getWeatherByCoords(0, 0)).rejects.toThrow("Network error");
  });
});
