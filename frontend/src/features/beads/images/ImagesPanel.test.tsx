import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeadImage } from "../api";
import { ImagesPanel } from "./ImagesPanel";

afterEach(cleanup);

const images: BeadImage[] = [
  { n: 1, path: "qa/01.png", caption: "01.png", available: true },
  { n: 2, path: "/tmp/x.png", caption: "x.png", available: false },
];

describe("ImagesPanel", () => {
  it("REQ-BEADS-029 two images, one missing", () => {
    render(<ImagesPanel project="alpha" beadId="a-1" images={images} onOpen={vi.fn()} />);
    const panel = screen.getByRole("region", { name: "Images (2)" });
    const tiles = within(panel).getAllByRole("listitem");
    const img = within(tiles[0]).getByRole("img", { name: "01.png" });
    expect(img).toHaveAttribute("src", "/api/beads/alpha/a-1/images/1");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(within(tiles[1]).getByText("Not on this host")).toBeInTheDocument();
    expect(within(tiles[1]).getByText("/tmp/x.png")).toBeInTheDocument();
    expect(within(tiles[1]).queryByRole("button")).toBeNull();
    expect(within(tiles[1]).queryByRole("img")).toBeNull();
  });

  it("REQ-BEADS-029 no images, no panel", () => {
    const { container } = render(<ImagesPanel project="alpha" beadId="a-1" images={[]} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-BEADS-029 click and Enter on a tile open the lightbox with the tile as opener", async () => {
    const onOpen = vi.fn();
    render(<ImagesPanel project="alpha" beadId="a-1" images={images} onOpen={onOpen} />);
    const tile = screen.getByRole("button");
    await userEvent.click(tile);
    expect(onOpen).toHaveBeenLastCalledWith(1, tile);
    tile.focus();
    await userEvent.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("REQ-BEADS-029 tiles wrap in a grid with no fixed width over 390px", () => {
    render(<ImagesPanel project="alpha" beadId="a-1" images={images} onOpen={vi.fn()} />);
    const list = screen.getByRole("list");
    expect(list.className).toContain("grid");
    expect(list.className).toContain("auto-fill");
    expect(list.className).not.toMatch(/\bw-\[?\d/);
  });
});
