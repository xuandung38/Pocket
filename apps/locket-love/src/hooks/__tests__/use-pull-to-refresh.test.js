import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullToRefresh } from "../use-pull-to-refresh";

const move = (clientY) => ({ touches: [{ clientY }] });
const start = (scrollTop, clientY) => ({
  currentTarget: { scrollTop },
  touches: [{ clientY }],
});

describe("usePullToRefresh", () => {
  it("fires onRefresh when pulled past threshold from the top", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 64 }),
    );
    act(() => result.current.handlers.onTouchStart(start(0, 0)));
    act(() => result.current.handlers.onTouchMove(move(200))); // pull = 96
    expect(result.current.pull).toBeGreaterThanOrEqual(64);
    act(() => result.current.handlers.onTouchEnd());
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.pull).toBe(0);
  });

  it("does not fire when the container is not scrolled to the top", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));
    act(() => result.current.handlers.onTouchStart(start(50, 0)));
    act(() => result.current.handlers.onTouchMove(move(200)));
    act(() => result.current.handlers.onTouchEnd());
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("does not fire below threshold", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 64 }),
    );
    act(() => result.current.handlers.onTouchStart(start(0, 0)));
    act(() => result.current.handlers.onTouchMove(move(40))); // pull = 20
    act(() => result.current.handlers.onTouchEnd());
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("respects enabled:false", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, enabled: false }),
    );
    act(() => result.current.handlers.onTouchStart(start(0, 0)));
    act(() => result.current.handlers.onTouchMove(move(200)));
    act(() => result.current.handlers.onTouchEnd());
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
