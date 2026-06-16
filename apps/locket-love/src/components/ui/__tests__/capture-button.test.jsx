// CaptureButton: idle vs recording visual + iOS long-press callout prevention.
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import CaptureButton from "../capture-button";

describe("<CaptureButton>", () => {
  it("renders a circular idle dot by default (not recording)", () => {
    const { container } = render(<CaptureButton />);
    const inner = container.querySelector("button > div");
    expect(inner).toBeTruthy();
    expect(inner.style.borderRadius).toBe("50%");
    expect(inner.style.background).toMatch(/#ffffff|rgb\(255,\s*255,\s*255\)/i);
  });

  it("turns the inner dot red + square when recording", () => {
    const { container } = render(<CaptureButton recording />);
    const inner = container.querySelector("button > div");
    // square stop indicator (8px radius, not a full circle)
    expect(inner.style.borderRadius).not.toBe("50%");
    expect(inner.style.background).toMatch(/#ff3b30|rgb\(255,\s*59,\s*48\)/i);
  });

  it("disables iOS long-press selection on the button (callout fix)", () => {
    const { container } = render(<CaptureButton />);
    const btn = container.querySelector("button");
    expect(btn.style.userSelect).toBe("none");
    // No focus ring → no square corners poking past the circular button on iOS.
    expect(btn.style.outline).toBe("none");
  });
});
