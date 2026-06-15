// Integration tests for the six live-data overlay renderers routed via
// <CaptionOverlay>. Each test asserts the rendered DOM without relying on CSS
// (test env skips Tailwind) — checks text, img src, and data-testid attributes.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CaptionOverlay from "../caption-overlay";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

describe("live-data overlays via <CaptionOverlay>", () => {
  it("weather: renders the weather icon <img> with https: prefix and temperature caption", () => {
    const ov = normalizeOverlay({
      type: "weather",
      caption: "23°C",
      weatherData: {
        icon: "//cdn.weatherapi.com/weather/64x64/day/113.png",
        condition: "Sunny",
        temp_c_rounded: 23,
      },
    });
    const { container } = render(<CaptionOverlay overlay={ov} />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toContain("https:");
    expect(screen.getByText("23°C")).toBeInTheDocument();
  });

  it("weather: also renders the icon from the feed `payload` shape (round-trip)", () => {
    // On the feed the weather object arrives as overlays.payload, not weatherData.
    const ov = normalizeOverlay({
      type: "weather",
      caption: "18°C",
      payload: { icon: "//cdn.weatherapi.com/weather/64x64/night/113.png", condition: "Clear" },
    });
    const { container } = render(<CaptionOverlay overlay={ov} />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toContain("https:");
    expect(screen.getByText("18°C")).toBeInTheDocument();
  });

  it("battery: renders percentage text (caption + %)", () => {
    const ov = normalizeOverlay({ type: "battery", caption: "80", icon: true });
    render(<CaptionOverlay overlay={ov} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("time: renders the time string from overlay.caption", () => {
    const ov = normalizeOverlay({ type: "time", caption: "09:41" });
    render(<CaptionOverlay overlay={ov} />);
    expect(screen.getByText("09:41")).toBeInTheDocument();
  });

  it("review: renders 4 filled stars and 1 empty star for rating 4", () => {
    const ov = normalizeOverlay({ type: "review", icon: 4, caption: "Great!" });
    render(<CaptionOverlay overlay={ov} />);
    expect(screen.getAllByTestId("star-filled")).toHaveLength(4);
    expect(screen.getAllByTestId("star-empty")).toHaveLength(1);
  });

  it("heart: renders the heart icon node", () => {
    const ov = normalizeOverlay({ type: "heart", caption: "inlove" });
    render(<CaptionOverlay overlay={ov} />);
    expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
  });

  it("location: renders the address caption text", () => {
    const ov = normalizeOverlay({ type: "location", caption: "Hà Nội, Việt Nam" });
    render(<CaptionOverlay overlay={ov} />);
    expect(screen.getByText("Hà Nội, Việt Nam")).toBeInTheDocument();
  });
});
