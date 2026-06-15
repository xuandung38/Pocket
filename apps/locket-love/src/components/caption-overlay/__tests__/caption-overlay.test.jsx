import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CaptionOverlay from "../caption-overlay";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

describe("<CaptionOverlay>", () => {
  it("renders the caption text for a default overlay", () => {
    render(<CaptionOverlay overlay={normalizeOverlay({ type: "default", caption: "Xin chào" })} />);
    expect(screen.getByText("Xin chào")).toBeInTheDocument();
  });

  it("renders a linear-gradient background for a custome overlay", () => {
    const { container } = render(
      <CaptionOverlay
        overlay={normalizeOverlay({ type: "custome", color_top: "#111", color_bottom: "#999", caption: "Theme" })}
      />,
    );
    const chip = container.querySelector(".caption-chip");
    expect(chip).toBeTruthy();
    expect(chip.style.background).toContain("linear-gradient");
  });

  it("renders an <img> icon + caption for image_icon", () => {
    render(
      <CaptionOverlay
        overlay={normalizeOverlay({ type: "image_icon", icon: "https://cdn.x/icon.png", caption: "Ảnh" })}
      />,
    );
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://cdn.x/icon.png");
    expect(screen.getByText("Ảnh")).toBeInTheDocument();
  });

  it("renders the snow effect node for a special overlay", () => {
    render(
      <CaptionOverlay overlay={normalizeOverlay({ type: "special", caption: "Tuyết", color_top: "#08203e" })} />,
    );
    expect(screen.getByTestId("snow")).toBeInTheDocument();
  });

  it("falls back to a gradient chip for an unknown type without crashing", () => {
    const { container } = render(
      <CaptionOverlay overlay={normalizeOverlay({ type: "zzz", caption: "Lạ", color_top: "#222", color_bottom: "#444" })} />,
    );
    expect(container.querySelector(".caption-chip")).toBeTruthy();
    expect(screen.getByText("Lạ")).toBeInTheDocument();
  });

  it("poll type via generic dispatch renders emoji display-only — no vote buttons", () => {
    // CaptionOverlay lacks vote context; it must never render clickable vote
    // buttons that would silently no-op. Verify the generic poll path is owner-
    // style (display div, not <button> elements for the emoji options).
    render(
      <CaptionOverlay
        overlay={normalizeOverlay({
          type: "poll",
          payload: { left_emoji: "🔥", right_emoji: "❄️" },
        })}
      />,
    );
    // Emojis are visible
    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.getByText("❄️")).toBeInTheDocument();
    // No interactive vote buttons — owner-style renders divs, not buttons
    const voteButtons = screen
      .queryAllByRole("button")
      .filter((b) => b.textContent.includes("🔥") || b.textContent.includes("❄️"));
    expect(voteButtons).toHaveLength(0);
  });
});
