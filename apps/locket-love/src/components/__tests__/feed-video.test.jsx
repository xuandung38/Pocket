// FeedVideo: autoplays while in view, pauses out of view (Locket-style).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import FeedVideo from "../feed-video";

let ioCallback;
let observeSpy;
let disconnectSpy;
let originalIO;

beforeEach(() => {
  observeSpy = vi.fn();
  disconnectSpy = vi.fn();
  ioCallback = null;
  // Save + restore the global so this fake never leaks into other test files
  // (a leaked IntersectionObserver caused order-dependent failures elsewhere).
  originalIO = global.IntersectionObserver;
  global.IntersectionObserver = class {
    constructor(cb) {
      ioCallback = cb;
    }
    observe = observeSpy;
    disconnect = disconnectSpy;
  };
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  global.IntersectionObserver = originalIO;
  vi.restoreAllMocks();
});

describe("<FeedVideo>", () => {
  it("observes the video element on mount", () => {
    render(<FeedVideo src="blob:fake" poster="p.jpg" />);
    expect(observeSpy).toHaveBeenCalledTimes(1);
  });

  it("plays when scrolled into view, pauses when out of view", () => {
    render(<FeedVideo src="blob:fake" />);

    ioCallback([{ isIntersecting: true }]);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    ioCallback([{ isIntersecting: false }]);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("renders the video with src + poster", () => {
    const { container } = render(<FeedVideo src="blob:fake" poster="p.jpg" />);
    const v = container.querySelector("video");
    expect(v).toBeTruthy();
    expect(v.getAttribute("src")).toBe("blob:fake");
    expect(v.getAttribute("poster")).toBe("p.jpg");
  });
});
