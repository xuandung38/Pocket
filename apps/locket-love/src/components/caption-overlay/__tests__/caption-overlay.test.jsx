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
});
