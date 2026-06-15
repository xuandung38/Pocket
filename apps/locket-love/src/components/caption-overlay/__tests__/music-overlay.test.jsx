import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CaptionOverlay from "../caption-overlay";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

describe("music overlay via <CaptionOverlay>", () => {
  it("renders the cover image, title and a marquee node", () => {
    const ov = normalizeOverlay({
      type: "music",
      caption: "Bài hát",
      music: { title: "Bài hát", artist: "Ca sĩ", image: "https://cdn/cover.jpg", platform: "spotify" },
    });
    const { container } = render(<CaptionOverlay overlay={ov} />);
    expect(screen.getByTestId("music-marquee")).toBeInTheDocument();
    expect(container.querySelector("img").getAttribute("src")).toBe("https://cdn/cover.jpg");
    expect(screen.getByText(/Bài hát/)).toBeInTheDocument();
  });
});
