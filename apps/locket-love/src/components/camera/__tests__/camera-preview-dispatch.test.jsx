// Tests for <CameraPreview> and <CameraToggle> dispatcher components.
// Strategy: mock isIOS() to control branching; assert that the correct
// platform branch renders via data-testid attributes.
// Real camera stream behaviour requires Phase 7 manual device QA.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// We vi.mock the is-ios module before importing the dispatchers.
vi.mock("../../../utils/is-ios.js", () => ({
  isIOS: vi.fn(),
  isAndroid: vi.fn(),
}));

// Stub child components so dispatchers stay testable in isolation.
vi.mock("../camera-preview/camera-preview-ios.jsx", () => ({
  default: () => <div data-testid="camera-preview-ios" />,
}));
vi.mock("../camera-preview/camera-preview-android.jsx", () => ({
  default: () => <div data-testid="camera-preview-android" />,
}));
vi.mock("../camera-toggle/camera-toggle-ios.jsx", () => ({
  default: () => <div data-testid="camera-toggle-ios" />,
}));
// Android toggle stub captures the onDeviceId prop so we can assert it is wired.
vi.mock("../camera-toggle/camera-toggle-android.jsx", () => ({
  default: ({ onDeviceId }) => (
    <div
      data-testid="camera-toggle-android"
      data-has-on-device-id={typeof onDeviceId === "function" ? "true" : "false"}
    />
  ),
}));

let isIOS;
let CameraPreview;
let CameraToggle;

beforeEach(async () => {
  vi.resetModules();
  // Re-import after resetting so mocks are fresh.
  const iosModule = await import("../../../utils/is-ios.js");
  isIOS = iosModule.isIOS;

  const previewModule = await import("../camera-preview/index.jsx");
  CameraPreview = previewModule.default;

  const toggleModule = await import("../camera-toggle/index.jsx");
  CameraToggle = toggleModule.default;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Shared minimal props for CameraPreview — real values don't matter here.
const basePreviewProps = {
  streamRef: { current: null },
  videoRef: { current: null },
  facingMode: "user",
  setFacingMode: vi.fn(),
  setShot: vi.fn(),
  setPhase: vi.fn(),
};

const baseToggleProps = {
  facingMode: "user",
  setFacingMode: vi.fn(),
  streamRef: { current: null },
  videoRef: { current: null },
  onDeviceId: vi.fn(),
};

// ── CameraPreview dispatcher ──────────────────────────────────────────────────
describe("<CameraPreview> dispatcher", () => {
  it("renders iOS branch when isIOS() returns true", () => {
    isIOS.mockReturnValue(true);
    render(<CameraPreview {...basePreviewProps} />);
    expect(screen.getByTestId("camera-preview-ios")).toBeInTheDocument();
    expect(screen.queryByTestId("camera-preview-android")).toBeNull();
  });

  it("renders Android branch when isIOS() returns false", () => {
    isIOS.mockReturnValue(false);
    render(<CameraPreview {...basePreviewProps} />);
    expect(screen.getByTestId("camera-preview-android")).toBeInTheDocument();
    expect(screen.queryByTestId("camera-preview-ios")).toBeNull();
  });
});

// ── CameraToggle dispatcher ───────────────────────────────────────────────────
describe("<CameraToggle> dispatcher", () => {
  it("renders iOS toggle when isIOS() returns true", () => {
    isIOS.mockReturnValue(true);
    render(<CameraToggle {...baseToggleProps} />);
    expect(screen.getByTestId("camera-toggle-ios")).toBeInTheDocument();
    expect(screen.queryByTestId("camera-toggle-android")).toBeNull();
  });

  it("renders Android toggle when isIOS() returns false", () => {
    isIOS.mockReturnValue(false);
    render(<CameraToggle {...baseToggleProps} />);
    expect(screen.getByTestId("camera-toggle-android")).toBeInTheDocument();
    expect(screen.queryByTestId("camera-toggle-ios")).toBeNull();
  });

  it("passes onDeviceId through to Android branch (H1 fix: flip updates deviceId)", () => {
    // This asserts the wiring that fixes H1: CameraToggle must forward onDeviceId
    // to the Android component so the flip's resolved deviceId reaches shared state.
    // Without this wire, flip silently ignores the new lens after a zoom switch.
    isIOS.mockReturnValue(false);
    render(<CameraToggle {...baseToggleProps} />);
    const androidEl = screen.getByTestId("camera-toggle-android");
    expect(androidEl.dataset.hasOnDeviceId).toBe("true");
  });
});
