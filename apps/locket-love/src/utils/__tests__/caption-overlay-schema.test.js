import { describe, it, expect } from "vitest";
import { defaultOverlay, normalizeOverlay } from "../caption-overlay-schema";

describe("normalizeOverlay", () => {
  it("returns the default shape for empty/invalid input", () => {
    expect(normalizeOverlay({})).toMatchObject({
      type: "default",
      text_color: "#FFFFFF",
      overlay_id: "standard",
    });
    expect(normalizeOverlay(null).type).toBe("default");
    expect(normalizeOverlay(undefined).type).toBe("default");
  });

  it("keeps gradient fields from a flat optionsData shape", () => {
    const ov = normalizeOverlay({
      color_top: "#000",
      color_bottom: "#fff",
      caption: "hi",
      type: "custome",
    });
    expect(ov).toMatchObject({
      color_top: "#000",
      color_bottom: "#fff",
      caption: "hi",
      type: "custome",
    });
  });

  it("maps the web preset shape (preset_id, color_text) onto canonical keys", () => {
    const ov = normalizeOverlay({
      preset_id: "winter-01",
      color_text: "#abcdef",
      color_top: "#111",
      color_bottom: "#222",
      caption: "Mùa đông",
      type: "decorative",
    });
    expect(ov.overlay_id).toBe("winter-01");
    expect(ov.text_color).toBe("#abcdef");
    expect(ov.type).toBe("decorative");
  });

  it("flattens the feed moment.overlays shape (background.colors, textColor, icon map)", () => {
    const ov = normalizeOverlay({
      id: "feed-1",
      type: "custome",
      textColor: "#abc",
      background: { colors: ["#111", "#222"] },
      icon: { type: "emoji", data: "🔥" },
      caption: "yo",
    });
    expect(ov.overlay_id).toBe("feed-1");
    expect(ov.color_top).toBe("#111");
    expect(ov.color_bottom).toBe("#222");
    expect(ov.text_color).toBe("#abc");
    expect(ov.icon).toBe("🔥");
  });

  it("preserves polymorphic icon values (review rating number, battery bool)", () => {
    expect(normalizeOverlay({ type: "review", icon: 4 }).icon).toBe(4);
    expect(normalizeOverlay({ type: "battery", icon: true }).icon).toBe(true);
  });

  it("passes per-type extras (weatherData, payload, music) straight through", () => {
    const weatherData = { temp_c_rounded: 23, icon: "//x.png" };
    const ov = normalizeOverlay({ type: "weather", weatherData });
    expect(ov.weatherData).toEqual(weatherData);
  });

  it("derives a unique overlay_id for id-less presets (picker selection key)", () => {
    // No overlay_id/preset_id/id → fall back to caption so distinct presets stay
    // distinguishable in the picker (else all collapse to "standard").
    expect(normalizeOverlay({ caption: "Vui", type: "custome" }).overlay_id).toBe("Vui");
    expect(normalizeOverlay({ caption: "Buồn", type: "custome" }).overlay_id).toBe("Buồn");
    expect(normalizeOverlay({ order_index: 3, type: "custome" }).overlay_id).toBe("idx-3");
    expect(normalizeOverlay({}).overlay_id).toBe("standard");
  });

  it("recovers the real widget type from the backend caption:<subtype> overlay_id", () => {
    expect(normalizeOverlay({ id: "caption:battery", type: "caption", text: "77%" }).type).toBe("battery");
    expect(normalizeOverlay({ id: "caption:location", type: "caption", text: "Hà Nội" }).type).toBe("location");
    expect(normalizeOverlay({ id: "caption:standard", type: "caption" }).type).toBe("default");
    expect(normalizeOverlay({ type: "static_content", text: "x" }).type).toBe("default");
    // compose-side explicit subtype is preserved (no caption: id).
    expect(normalizeOverlay({ type: "battery", caption: "77", icon: false }).type).toBe("battery");
  });

  it("drops SF-symbol icons (iOS glyph names) so they never render as text", () => {
    const ov = normalizeOverlay({
      id: "caption:battery",
      type: "caption",
      icon: { type: "sf_symbol", data: "battery.100" },
      text: "77%",
    });
    expect(ov.icon).toBe("");
  });

  it("does not mutate the shared defaultOverlay constant", () => {
    normalizeOverlay({ caption: "mutate?" });
    expect(defaultOverlay.caption).toBe("");
  });
});
