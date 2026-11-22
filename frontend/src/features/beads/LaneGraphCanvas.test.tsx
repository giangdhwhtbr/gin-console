import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { laneGraph } from "./laneGraph";
import { E12, e12, g2 } from "./laneFixtures";
import { LaneGraphCanvas } from "./LaneGraphCanvas";

const NOW = new Date("2026-11-20T10:00:00Z");
const graph = laneGraph(e12, E12, new Set(e12.map((b) => b.id)), NOW);

function show(selected = "") {
  const fns = { onSelect: vi.fn(), onOpen: vi.fn(), onEscape: vi.fn() };
  render(<LaneGraphCanvas graph={graph} beads={e12} selected={selected} tabStop={`${E12}.1`} {...fns} />);
  return fns;
}
const node = (n: number) => document.querySelector<HTMLElement>(`[data-node="${E12}.${n}"]`);

afterEach(cleanup);

describe("LaneGraphCanvas", () => {
  it("REQ-UI-117 Boxes in tiers: a box per lane, and no gate node", () => {
    show();
    for (const lane of ["be", "fe", "qa", "No lane"]) expect(screen.getByRole("region", { name: `Lane ${lane}` })).toBeInTheDocument();
    expect(document.querySelector(`[data-node="${g2.id}"]`)).toBeNull();
    expect(node(4)).not.toBeNull();
  });

  it("REQ-UI-117 Gate chips: Waiting on the open gate, Merged on the closed one", () => {
    show();
    expect(document.querySelector(`[data-chip="${g2.id}"]`)).toHaveTextContent("Waiting for be #2");
    expect(document.querySelector('[data-chip="ex-e12.10"]')).toHaveTextContent("Merged fe #3");
    // REQ-UI-117 a label on the surface colour, without a border or an icon
    const label = document.querySelector('[data-chip="ex-e12.10"]');
    expect(label).toHaveClass("bg-card");
    expect(label?.className).not.toMatch(/border|rounded/);
    expect(label?.querySelector("svg")).toBeNull();
    expect(document.querySelectorAll("path[stroke-dasharray]")).toHaveLength(1);
  });

  it("REQ-UI-117 Track not drawn: a chip on the box and no arrow for it", () => {
    const matched = new Set(e12.map((b) => b.id).filter((id) => id !== `${E12}.2`));
    const g = laneGraph(e12, E12, matched, NOW);
    render(<LaneGraphCanvas graph={g} beads={e12} selected="" tabStop={`${E12}.1`} onSelect={vi.fn()} onOpen={vi.fn()} onEscape={vi.fn()} />);
    expect(document.querySelector(`[data-chip="${g2.id}"]`)).toHaveTextContent("Waiting for track 2");
    expect(document.querySelector(`[data-arrow="${E12}.2>${E12}.4"]`)).toBeNull();
  });

  it("REQ-UI-117 selecting a card and opening it", async () => {
    const fns = show();
    await userEvent.click(node(2)!);
    expect(fns.onSelect).toHaveBeenCalledWith(`${E12}.2`);
    await userEvent.dblClick(node(2)!);
    expect(fns.onOpen).toHaveBeenCalledWith(`${E12}.2`);
  });

  it("REQ-UI-117 Keys between boxes: Right stays in the box, then crosses to track 4 in qa, Enter selects it, Escape escapes", async () => {
    const fns = show();
    node(1)!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(node(2)).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(node(4)).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(fns.onSelect).toHaveBeenCalledWith(`${E12}.4`);
    await userEvent.keyboard("{ArrowDown}");
    expect(node(7)).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(fns.onEscape).toHaveBeenCalled();
  });

  it("REQ-UI-117 selection highlights the chain and dims the rest", () => {
    show(`${E12}.4`);
    expect(node(3)).toHaveAttribute("data-dimmed", "false");
    expect(node(7)).toHaveAttribute("data-dimmed", "true");
  });

  it("REQ-UI-117 the screen-reader list has a line per lane and arrow", () => {
    show();
    const list = screen.getByRole("list", { name: "Lanes" });
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThanOrEqual(graph.boxes.length + graph.arrows.length);
  });

  it("REQ-UI-077 zoom works as in the layered graph", async () => {
    show();
    const zoom = within(screen.getByRole("group", { name: "Zoom" }));
    expect(zoom.getByText("100%")).toBeInTheDocument();
    await userEvent.click(zoom.getByRole("button", { name: "Zoom in" }));
    expect(zoom.getByText("110%")).toBeInTheDocument();
    expect(fireEvent.wheel(screen.getByTestId("graph-canvas"), { deltaY: -100, ctrlKey: true })).toBe(false);
  });

  it("REQ-UI-122 Wheel over the Graph view: a lane box canvas scrolls only sideways, is as tall as its graph and a plain wheel is not prevented", () => {
    show();
    const canvas = screen.getByTestId("graph-canvas");
    for (const c of ["isolate", "overflow-x-auto", "overflow-y-hidden", "overscroll-x-contain"]) expect(canvas.classList.contains(c)).toBe(true);
    for (const c of ["overflow-auto", "overscroll-contain"]) expect(canvas.classList.contains(c)).toBe(false);
    expect(canvas.className).not.toContain("100dvh");
    expect(Number.parseFloat(canvas.style.height)).toBeGreaterThanOrEqual(graph.height);
    expect(fireEvent.wheel(canvas, { deltaY: 600 })).toBe(true);
  });
});
