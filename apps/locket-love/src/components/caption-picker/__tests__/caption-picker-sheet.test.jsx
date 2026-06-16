import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CaptionPickerSheet from "../caption-picker-sheet";
import { toOverlayData } from "@/utils/caption-overlay-schema";

// Build a v2 section with already-normalized overlay items (the store normalizes
// before handing sections to the sheet).
const section = (section_id, name, items) => ({ section_id, name, order_id: 0, items });

describe("<CaptionPickerSheet>", () => {
  it("renders the General tier suggest pills and forwards the overlay on pick", () => {
    const onSelect = vi.fn();
    render(
      <CaptionPickerSheet
        open
        onClose={() => {}}
        sections={[
          section("suggest", "Suggest", [
            { overlay_id: "c1", type: "custom", caption: "Vui", color_top: "#111", color_bottom: "#222", text_color: "#fff", icon: "" },
          ]),
        ]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("General")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Vui"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ overlay_id: "c1", type: "custom" });
  });

  it("renders a zodiac (star_sign) pill in the Decorative tier", () => {
    render(
      <CaptionPickerSheet
        open
        onClose={() => {}}
        sections={[
          section("star_sign", "Cung hoàng đạo", [
            { overlay_id: "gemini", type: "star_sign", caption: "Mùa Song Tử", icon: "https://x/gemini.png" },
          ]),
        ]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("Decorative")).toBeInTheDocument();
    expect(screen.getByText("Mùa Song Tử")).toBeInTheDocument();
  });

  it("shows tier labels but no section pills when sections are empty", () => {
    render(<CaptionPickerSheet open onClose={() => {}} sections={[]} onSelect={() => {}} />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Decorative")).toBeInTheDocument();
    expect(screen.queryByText("Vui")).not.toBeInTheDocument();
  });
});

describe("toOverlayData (POST-mapping bug regression)", () => {
  it("projects a selected overlay onto the flat optionsData fields the BE reads", () => {
    const selectedOverlay = {
      overlay_id: "c1",
      type: "custome",
      color_top: "#111",
      color_bottom: "#222",
      text_color: "#fff",
      icon: "🔥",
      caption: "Vui",
      _raw: { junk: true },
    };
    const data = toOverlayData(selectedOverlay);
    expect(data).toEqual({
      overlay_id: "c1",
      type: "custome",
      color_top: "#111",
      color_bottom: "#222",
      text_color: "#fff",
      icon: "🔥",
      caption: "Vui",
    });
    // transient UI fields must not ride onto the wire
    expect(data._raw).toBeUndefined();
  });

  it("returns an empty object for no overlay (plain message slot)", () => {
    expect(toOverlayData(null)).toEqual({});
  });
});
