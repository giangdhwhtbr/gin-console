import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("REQ-BEADS-029 attachments: loaded from the attachment route, reasons read as text with the path", () => {
    const sha = "a".repeat(64);
    const list: BeadImage[] = [
      { n: 1, path: null, caption: "Step 1", available: true, sha256: sha, served_as: "attachment", reason: null },
      { n: 2, path: null, caption: "b", available: false, sha256: "b".repeat(64), served_as: null, reason: "pruned" },
      { n: 3, path: "qa/c.png", caption: "c", available: false, sha256: "c".repeat(64), served_as: null, reason: "not_fetched" },
      { n: 4, path: null, caption: "d", available: false, sha256: "d".repeat(64), served_as: null, reason: "not_listed" },
      { n: 5, path: null, caption: "e", available: false, sha256: "e".repeat(64), served_as: null, reason: "unsupported_store" },
    ];
    render(<ImagesPanel project="alpha" beadId="a-1" images={list} onOpen={vi.fn()} />);
    const tiles = screen.getAllByRole("listitem");
    expect(within(tiles[0]).getByRole("img", { name: "Step 1" })).toHaveAttribute(
      "src",
      `/api/beads/alpha/a-1/attachments/${sha}`,
    );
    expect(within(tiles[1]).getByText("Pruned")).toBeInTheDocument();
    expect(within(tiles[2]).getByText("Not fetched yet")).toBeInTheDocument();
    expect(within(tiles[2]).getByText("qa/c.png")).toBeInTheDocument();
    expect(within(tiles[3]).getByText("Not attached to this bead")).toBeInTheDocument();
    expect(within(tiles[4]).getByText("Stored where this host cannot read it")).toBeInTheDocument();
  });

  it("REQ-BEADS-029 image fails to load: the tile shows its caption instead of a broken image", () => {
    render(<ImagesPanel project="alpha" beadId="a-1" images={[images[0]]} onOpen={vi.fn()} />);
    fireEvent.error(screen.getByRole("img", { name: "01.png" }));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("button")).toHaveTextContent("01.png");
  });
});
