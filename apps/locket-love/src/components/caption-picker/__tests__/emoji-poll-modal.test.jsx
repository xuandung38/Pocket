import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmojiPollModal from "../emoji-poll-modal";

describe("<EmojiPollModal>", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <EmojiPollModal open={false} onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the modal title when open=true", () => {
    render(<EmojiPollModal open onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Chọn emoji poll/i)).toBeInTheDocument();
  });

  it("pair tab is active by default and shows pair buttons", () => {
    render(<EmojiPollModal open onSelect={vi.fn()} onClose={vi.fn()} />);
    const pairBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.pairBtn === "true");
    expect(pairBtns.length).toBeGreaterThan(0);
  });

  it("clicking a suggested pair calls onSelect with {left_emoji, right_emoji} and closes", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<EmojiPollModal open onSelect={onSelect} onClose={onClose} />);
    const pairBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.pairBtn === "true");
    fireEvent.click(pairBtns[0]);
    expect(onSelect).toHaveBeenCalledOnce();
    const arg = onSelect.mock.calls[0][0];
    expect(arg).toHaveProperty("left_emoji");
    expect(arg).toHaveProperty("right_emoji");
    expect(typeof arg.left_emoji).toBe("string");
    expect(typeof arg.right_emoji).toBe("string");
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ---- Single tab -----------------------------------------------------------

  it("switching to 'Chỉnh lẻ' tab shows side selector and emoji grid", () => {
    render(<EmojiPollModal open onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Chỉnh lẻ/ }));
    const singleBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.singleBtn === "true");
    expect(singleBtns.length).toBeGreaterThan(0);
    // Side selector buttons are visible
    const sideBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.sideBtn === "true");
    expect(sideBtns.length).toBe(2);
  });

  it("default active side is 'left'; left side-button is highlighted", () => {
    render(<EmojiPollModal open onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Chỉnh lẻ/ }));
    const sideBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.sideBtn === "true");
    // Left is index 0; its aria-pressed or data-active should be true
    expect(sideBtns[0].dataset.active).toBe("true");
    expect(sideBtns[1].dataset.active).toBe("false");
  });

  it("tapping an emoji on 'left' side emits merged full payload preserving right default", () => {
    const onSelect = vi.fn();
    const value = { left_emoji: "🔥", right_emoji: "❄️" };
    render(
      <EmojiPollModal open value={value} onSelect={onSelect} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Chỉnh lẻ/ }));
    // Active side is left by default; pick any single emoji
    const singleBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.singleBtn === "true");
    fireEvent.click(singleBtns[0]); // e.g. "👍"
    expect(onSelect).toHaveBeenCalledOnce();
    const arg = onSelect.mock.calls[0][0];
    // Full merged payload: new left, preserved right
    expect(arg).toHaveProperty("left_emoji");
    expect(arg).toHaveProperty("right_emoji", "❄️");
  });

  it("switching to right side then tapping sets right_emoji, preserves left", () => {
    const onSelect = vi.fn();
    const value = { left_emoji: "🔥", right_emoji: "❄️" };
    render(
      <EmojiPollModal open value={value} onSelect={onSelect} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Chỉnh lẻ/ }));
    // Switch to right side
    const sideBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.sideBtn === "true");
    fireEvent.click(sideBtns[1]); // right
    // Pick a single emoji
    const singleBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.singleBtn === "true");
    fireEvent.click(singleBtns[0]);
    expect(onSelect).toHaveBeenCalledOnce();
    const arg = onSelect.mock.calls[0][0];
    // New right, preserved left
    expect(arg).toHaveProperty("right_emoji");
    expect(arg).toHaveProperty("left_emoji", "🔥");
  });

  it("single tab: after picking, modal stays open (no onClose called)", () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(
      <EmojiPollModal open onSelect={onSelect} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Chỉnh lẻ/ }));
    const singleBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.singleBtn === "true");
    fireEvent.click(singleBtns[0]);
    expect(onSelect).toHaveBeenCalledOnce();
    // Modal stays open — user may want to edit the other side next
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to 👍/👎 defaults when no value prop given", () => {
    const onSelect = vi.fn();
    render(<EmojiPollModal open onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Chỉnh lẻ/ }));
    const singleBtns = screen
      .getAllByRole("button")
      .filter((b) => b.dataset.singleBtn === "true");
    fireEvent.click(singleBtns[0]);
    const arg = onSelect.mock.calls[0][0];
    // right_emoji falls back to 👎 (default) when no value provided
    expect(arg).toHaveProperty("right_emoji", "👎");
  });
});
