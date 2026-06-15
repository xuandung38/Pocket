import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PollOverlay from "../poll-overlay";
import CaptionOverlay from "../caption-overlay";
import { normalizeOverlay } from "@/utils/caption-overlay-schema";

describe("<PollOverlay>", () => {
  it("friend-view: renders default left and right emoji buttons", () => {
    render(<PollOverlay overlayData={normalizeOverlay({ type: "poll" })} />);
    // Default emojis are 👍 (left) and 👎 (right)
    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("👎")).toBeInTheDocument();
  });

  it("friend-view: renders custom emoji from payload", () => {
    const ov = normalizeOverlay({
      type: "poll",
      payload: { left_emoji: "🔥", right_emoji: "❄️" },
    });
    render(<PollOverlay overlayData={ov} />);
    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.getByText("❄️")).toBeInTheDocument();
  });

  it("friend-view: clicking left emoji button calls onVote with left emoji", () => {
    const onVote = vi.fn();
    const ov = normalizeOverlay({
      type: "poll",
      payload: { left_emoji: "👍", right_emoji: "👎" },
    });
    render(<PollOverlay overlayData={ov} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: /👍/ }));
    expect(onVote).toHaveBeenCalledWith("👍");
  });

  it("friend-view: clicking right emoji button calls onVote with right emoji", () => {
    const onVote = vi.fn();
    const ov = normalizeOverlay({
      type: "poll",
      payload: { left_emoji: "🔥", right_emoji: "❄️" },
    });
    render(<PollOverlay overlayData={ov} onVote={onVote} />);
    fireEvent.click(screen.getByRole("button", { name: /❄️/ }));
    expect(onVote).toHaveBeenCalledWith("❄️");
  });

  it("owner-view: shows leftCount and rightCount when isPoll is true", () => {
    const ov = normalizeOverlay({
      type: "poll",
      payload: { left_emoji: "👍", right_emoji: "👎" },
    });
    const counts = { isPoll: true, leftCount: 3, rightCount: 5 };
    render(
      <PollOverlay
        overlayData={ov}
        pollVariant="owner"
        pollCounts={counts}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("owner-view: hides counts when isPoll is false", () => {
    const ov = normalizeOverlay({ type: "poll" });
    render(
      <PollOverlay
        overlayData={ov}
        pollVariant="owner"
        pollCounts={{ isPoll: false, leftCount: 0, rightCount: 0 }}
      />,
    );
    // No count numbers visible
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("CaptionOverlay dispatches poll type to PollOverlay display-only (no vote buttons)", () => {
    // Generic dispatch lacks vote context — must render owner-style (divs, no buttons).
    // Real callers (feed-screen, captured-send-preview) render <PollOverlay> directly.
    const ov = normalizeOverlay({
      type: "poll",
      payload: { left_emoji: "👍", right_emoji: "👎" },
    });
    render(<CaptionOverlay overlay={ov} />);
    // Emojis are visible
    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("👎")).toBeInTheDocument();
    // No interactive vote buttons
    const voteButtons = screen
      .queryAllByRole("button")
      .filter((b) => b.textContent.includes("👍") || b.textContent.includes("👎"));
    expect(voteButtons).toHaveLength(0);
  });
});
