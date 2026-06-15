import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import GlobalReactionEffect from "../global-reaction-effect";
import { useReactionStore } from "@/stores/use-reaction-store";

// rAF not available in jsdom — provide a synchronous stub so the animation
// loop actually advances during test execution.
beforeEach(() => {
  vi.useFakeTimers();
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  // Reset store between tests
  useReactionStore.setState({ reaction: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<GlobalReactionEffect>", () => {
  it("renders nothing when reaction is null", () => {
    const { container } = render(<GlobalReactionEffect />);
    expect(container.firstChild).toBeNull();
  });

  it("spawns emoji elements after triggerReaction is called", async () => {
    render(<GlobalReactionEffect />);

    await act(async () => {
      useReactionStore.getState().triggerReaction("🎉");
    });
    // Advance rAF ticks — each fake setTimeout(cb,16) fires here, running the
    // animation loop. After a few frames particles should be in the DOM.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Particles are rendered as <span> inside a fixed div in the document body.
    // document.body includes all rendered content (jsdom doesn't hide fixed elems).
    const emojiSpans = document.querySelectorAll("span");
    const hasEmoji = Array.from(emojiSpans).some((s) => s.textContent.includes("🎉"));
    expect(hasEmoji).toBe(true);
  });

  it("cleans up particles after animation completes", async () => {
    render(<GlobalReactionEffect />);

    await act(async () => {
      useReactionStore.getState().triggerReaction("🎉");
    });
    // Advance enough time for all 30 particles to spawn + travel off-screen.
    // jsdom: innerHeight=768, worst-case particle y≈1228, slowest speed≈4.4px/frame
    // → needs ~301 frames × 16ms ≈ 4.8s. Use 10s buffer to eliminate randomness.
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    const emojiSpans = document.querySelectorAll("span");
    const stillHasEmoji = Array.from(emojiSpans).some((s) => s.textContent.includes("🎉"));
    expect(stillHasEmoji).toBe(false);
  });
});
