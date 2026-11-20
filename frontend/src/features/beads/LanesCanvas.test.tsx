import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import { e12, E12, g2, tracks, t4 } from "./laneFixtures";
import { lanesOf } from "./lanes";
import { LanesCanvas } from "./LanesCanvas";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const board = lanesOf(e12, E12, new Set(tracks.map((t) => t.id)), new Date("2026-11-20T10:00:00Z"));
const props = { board, beads: e12, selected: "", tabStop: t4.id, onSelect: vi.fn(), onOpen: vi.fn(), onEscape: vi.fn() };

describe("LanesCanvas", () => {
  it("REQ-UI-111 the header column is opaque and sticky, the cards sit at the board's positions", () => {
    render(<LanesCanvas {...props} />);
    const header = screen.getByRole("region", { name: "Lane be" }).parentElement!;
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("bg-card");
    expect(header.style.width).toBe("240px"); // the jsdom fallback
    const card = screen.getByRole("button", { name: new RegExp(`^${t4.id}`) });
    const placed = board.rows.flatMap((r) => r.cards).find((c) => c.bead.id === t4.id)!;
    expect(card.style.left).toBe(`${placed.x}px`);
    expect(card.style.top).toBe(`${placed.y}px`);
  });

  it("REQ-UI-110 the lanes canvas keeps its layers inside (isolate)", () => {
    render(<LanesCanvas {...props} />);
    expect(screen.getByTestId("lanes-canvas").className).toContain("isolate");
  });

  it("REQ-UI-122 Wheel over the Lanes view: the box is as tall as the board, scrolls only sideways and a plain wheel is not prevented", () => {
    render(<LanesCanvas {...props} />);
    const canvas = screen.getByTestId("lanes-canvas");
    for (const c of ["isolate", "overflow-x-auto", "overflow-y-hidden", "overscroll-x-contain"]) expect(canvas.classList.contains(c)).toBe(true);
    for (const c of ["overflow-auto", "overscroll-contain"]) expect(canvas.classList.contains(c)).toBe(false);
    expect(canvas.className).not.toContain("100dvh");
    const height = Number.parseFloat(canvas.style.height);
    expect(height).toBeGreaterThanOrEqual(board.height);
    expect(height).toBeLessThan(board.height + 40);
    expect(fireEvent.wheel(canvas, { deltaY: 600 })).toBe(true);
  });

  it("REQ-UI-111 the header is 168px under 1024px windows", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<LanesCanvas {...props} />);
    expect(screen.getByRole("region", { name: "Lane be" }).parentElement!.style.width).toBe("168px");
  });

  it("REQ-UI-113 one arrow per link, and an opaque marker with its words above the arrows", () => {
    const { container } = render(<LanesCanvas {...props} />);
    expect(container.querySelectorAll("svg polyline")).toHaveLength(board.arrows.length);
    const marker = container.querySelector<HTMLElement>("[data-marker]")!;
    expect(marker.className).toContain("bg-card");
    expect(marker).toHaveTextContent(/Waiting|Merged/);
  });

  it("REQ-UI-114 keys: the list for screen readers has one item per lane and gate", () => {
    render(<LanesCanvas {...props} />);
    expect(screen.getByRole("list", { name: "Lanes" }).children).toHaveLength(board.rows.length + board.markers.length);
  });

  it("REQ-UI-114 two merge gates between the same tracks give two list items and no duplicate key warning", () => {
    const twin = bead(`${E12}.11`, { parent: E12, waits_for: g2.waits_for });
    const beads = e12.map((b) => (b.id === t4.id ? { ...b, blocked_by: [...b.blocked_by, twin.id] } : b)).concat(twin);
    const twinBoard = lanesOf(beads, E12, new Set(tracks.map((t) => t.id)), new Date("2026-11-20T10:00:00Z"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<LanesCanvas {...props} board={twinBoard} beads={beads} />);
    const items = screen.getByRole("list", { name: "Lanes" }).children;
    expect(items).toHaveLength(twinBoard.rows.length + 3);
    expect(Array.from(items).filter((li) => li.textContent === "qa #4 waits for be #2: merge pending")).toHaveLength(2);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
