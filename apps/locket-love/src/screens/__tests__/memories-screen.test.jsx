import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));

// Stub child components that pull in their own stores/assets.
vi.mock("../../components/ui/avatar", () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock("../../components/ui/bottom-nav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("../../components/sheets/profile-sheet", () => ({ default: () => null }));

// Mutable store state driven per test.
const storeState = {
  moments: {},
  streak: null,
  loading: false,
  hasMore: false,
  loadMemories: vi.fn(),
  loadMoreOlder: vi.fn(),
};
let byDateMock = {};

vi.mock("@/stores", () => ({
  useMemoriesStore: (sel) => (sel ? sel(storeState) : storeState),
  selectMemoriesByDate: () => byDateMock,
  useAuthStore: (sel) => (sel ? sel({ user: { name: "Tôi", avatar: null } }) : { user: { name: "Tôi" } }),
}));

import MemoriesScreen from "../memories-screen";

beforeEach(() => {
  navigateMock.mockClear();
  storeState.moments = {};
  storeState.streak = null;
  storeState.loading = false;
  byDateMock = {};
});

describe("<MemoriesScreen>", () => {
  it("calls loadMemories on mount", () => {
    render(<MemoriesScreen />);
    expect(storeState.loadMemories).toHaveBeenCalled();
  });

  it("renders a photo cell for a day with moments and navigates on click", () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    storeState.moments = { a: { id: "a", thumbnailUrl: "u/a", createTime: today.getTime() } };
    storeState.streak = { count: 5 };
    byDateMock = { [key]: [{ id: "a", thumbnailUrl: "u/a" }] };

    render(<MemoriesScreen />);
    // Calendar-cell img is alt-tagged with the day number (galaxy imgs use alt="").
    const cellImg = screen.getByAltText(String(today.getDate()));
    expect(cellImg.getAttribute("src")).toBe("u/a");

    fireEvent.click(cellImg.closest("button"));
    expect(navigateMock).toHaveBeenCalledWith(`/feed?date=${key}`);
  });

  it("shows the streak count in stats", () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    storeState.moments = { a: { id: "a", thumbnailUrl: "u/a", createTime: today.getTime() } };
    storeState.streak = { count: 9 };
    byDateMock = { [key]: [{ id: "a", thumbnailUrl: "u/a" }] };
    render(<MemoriesScreen />);
    expect(screen.getByText(/9d chuỗi/)).toBeInTheDocument();
  });

  it("renders an empty state when there are no moments", () => {
    storeState.moments = {};
    storeState.loading = false;
    byDateMock = {};
    render(<MemoriesScreen />);
    expect(screen.getByTestId("memories-empty")).toBeInTheDocument();
  });
});
