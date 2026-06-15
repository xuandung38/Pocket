// Tests for Android zoom-label generation logic.
// Verifies that getZoomLabels() + labelToZoomValue() produce the right label
// set and clamped values for a variety of reported capability ranges.
import { describe, it, expect } from "vitest";
import { getZoomLabels, labelToZoomValue } from "../android-zoom-label-utils.js";

describe("getZoomLabels()", () => {
  it("returns only ['1x'] when no zoom capability", () => {
    expect(getZoomLabels(null)).toEqual(["1x"]);
    expect(getZoomLabels(undefined)).toEqual(["1x"]);
  });

  it("includes 0.5x when min < 1", () => {
    const labels = getZoomLabels({ min: 0.5, max: 3 });
    expect(labels).toContain("0.5x");
    expect(labels).toContain("1x");
    expect(labels).toContain("2x");
    expect(labels).toContain("3x");
  });

  it("excludes 0.5x when min >= 1", () => {
    const labels = getZoomLabels({ min: 1, max: 3 });
    expect(labels).not.toContain("0.5x");
    expect(labels).toContain("1x");
    expect(labels).toContain("2x");
    expect(labels).toContain("3x");
  });

  it("includes 2x when max >= 2 but not 3x when max < 3", () => {
    const labels = getZoomLabels({ min: 1, max: 2 });
    expect(labels).toContain("2x");
    expect(labels).not.toContain("3x");
  });

  it("returns only ['1x'] when max === 1", () => {
    const labels = getZoomLabels({ min: 1, max: 1 });
    expect(labels).toEqual(["1x"]);
  });

  it("de-duplicates labels (no repeated entries)", () => {
    const labels = getZoomLabels({ min: 0.5, max: 3 });
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("labelToZoomValue()", () => {
  const caps = { min: 0.5, max: 3 };

  it("maps '0.5x' to 0.5 within range", () => {
    expect(labelToZoomValue("0.5x", caps)).toBe(0.5);
  });

  it("maps '1x' to 1 within range", () => {
    expect(labelToZoomValue("1x", caps)).toBe(1);
  });

  it("maps '2x' to 2 within range", () => {
    expect(labelToZoomValue("2x", caps)).toBe(2);
  });

  it("maps '3x' to 3 within range", () => {
    expect(labelToZoomValue("3x", caps)).toBe(3);
  });

  it("clamps '0.5x' up to min when min > 0.5", () => {
    expect(labelToZoomValue("0.5x", { min: 1, max: 3 })).toBe(1);
  });

  it("clamps '3x' down to max when max < 3", () => {
    expect(labelToZoomValue("3x", { min: 1, max: 2 })).toBe(2);
  });
});
