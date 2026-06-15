import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CaptionPickerSheet from "../caption-picker-sheet";
import { toOverlayData } from "@/utils/caption-overlay-schema";

const overlaysWith = (extra) => ({
  custome: [],
  background: [],
  decorative: [],
  image_icon: [],
  image_gif: [],
  special: [],
  ...extra,
});

describe("<CaptionPickerSheet>", () => {
  it("renders a Themes section and forwards a flat overlay object on pick", () => {
    const onSelect = vi.fn();
    render(
      <CaptionPickerSheet
        open
        onClose={() => {}}
        captionOverlays={overlaysWith({
          custome: [{ preset_id: "c1", type: "custome", color_top: "#111", color_bottom: "#222", caption: "Vui" }],
        })}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Themes")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Vui"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(arg).toMatchObject({ type: "custome", overlay_id: "c1", color_top: "#111" });
  });

  it("hides sections whose overlay group is empty", () => {
    render(
      <CaptionPickerSheet open onClose={() => {}} captionOverlays={overlaysWith({})} onSelect={() => {}} />,
    );
    expect(screen.queryByText("Themes")).not.toBeInTheDocument();
    expect(screen.queryByText("Icon")).not.toBeInTheDocument();
    expect(screen.queryByText("GIF")).not.toBeInTheDocument();
  });

  it("renders a snow preview node for a special preset", () => {
    render(
      <CaptionPickerSheet
        open
        onClose={() => {}}
        captionOverlays={overlaysWith({
          special: [{ preset_id: "snow-1", type: "special", color_top: "#08203e", caption: "Tuyết" }],
        })}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("Đặc biệt")).toBeInTheDocument();
    expect(screen.getByTestId("snow")).toBeInTheDocument();
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
