import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import { fitWidth, GraphCanvas } from "./GraphCanvas";
import { NODE, place, scopeGraph } from "./graph";

const OFF = { onlyLinked: false };
const epic = (id: string, extra = {}) => bead(id, { issue_type: "epic", ...extra });
const task = (id: string, parent: string | null, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent, blocked_by: blockedBy, ...extra });

function box(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(height);
}

function show(graph = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e")], "e", OFF), selected = "") {
  const calls = { select: vi.fn(), open: vi.fn(), escape: vi.fn() };
  render(
    <GraphCanvas
      graph={graph}
      selected={selected}
      tabStop={selected || (graph.nodes[0]?.bead.id ?? "")}
      onSelect={calls.select}
      onOpen={calls.open}
      onEscape={calls.escape}
    />,
  );
  return calls;
}
const zoom = () => within(screen.getByRole("group", { name: "Zoom" }));
const node = (id: string) => screen.getByRole("button", { name: new RegExp(`^${id}`) });

describe("GraphNode content", () => {
  it("REQ-UI-049 REQ-UI-054 REQ-UI-107 Long state line: the row does not wrap and the id is shortened", () => {
    const id = "ex-payments-provider-migration-and-reconciliation-2026";
    const kids = ["a", "b", "c", "d", "e"].map((k, i) => task(k, id, [], { status: i < 2 ? "closed" : "open" }));
    show(scopeGraph([epic(id, { status: "in_progress", child_counts: { total: 5, closed: 2, prep_total: 0, prep_closed: 0 } }), ...kids], null, OFF));
    const n = node(id);
    expect(n).toHaveAccessibleName(new RegExp(`^${id}`));
    expect(within(n).getByText("ex-payments-pr…tion-2026")).toHaveAttribute("title", id);
    const done = within(n).getByText("2 of 5 done");
    expect(done).toHaveClass("shrink-0");
    expect(done.parentElement).toHaveClass("whitespace-nowrap", "min-w-0");
    const label = within(n).getByText("In progress");
    expect(label).toHaveClass("truncate");
    expect(label.closest("[data-state]")).toHaveAttribute("title", "In progress");
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GraphCanvas", () => {
  it("REQ-UI-048 a heading counts the unlinked group above its first row", () => {
    const graph = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e"), task("d", "e")], "e", OFF);
    show(graph);
    const heading = screen.getByText("2 without dependencies");
    expect(parseFloat(heading.style.top) + NODE.head).toBe(parseFloat(node("c").style.top));
    expect(parseFloat(heading.style.top)).toBeGreaterThan(parseFloat(node("b").style.top) + NODE.h);
  });

  it("REQ-UI-048 no heading without unlinked nodes", () => {
    show(scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"])], "e", OFF));
    expect(screen.queryByText(/without dependencies/)).toBeNull();
  });

  it("REQ-UI-077 Zoom out twice from 100% reads 80%", async () => {
    box(5000, 5000);
    show();
    expect(zoom().getByText("100%")).toBeInTheDocument();
    await userEvent.click(zoom().getByRole("button", { name: "Zoom out" }));
    await userEvent.click(zoom().getByRole("button", { name: "Zoom out" }));
    expect(zoom().getByText("80%")).toBeInTheDocument();
  });

  it("REQ-UI-077 stays at 40% and at 200%", async () => {
    box(1, 1);
    show();
    expect(zoom().getByText("40%")).toBeInTheDocument();
    await userEvent.click(zoom().getByRole("button", { name: "Zoom out" }));
    expect(zoom().getByText("40%")).toBeInTheDocument();
    for (let i = 0; i < 20; i++) await userEvent.click(zoom().getByRole("button", { name: "Zoom in" }));
    expect(zoom().getByText("200%")).toBeInTheDocument();
  });

  it("REQ-UI-077 starts fitted and Fit to view brings it back below 100%", async () => {
    box(100, 200);
    show();
    const first = zoom().getByText(/%$/).textContent;
    expect(Number.parseInt(first ?? "", 10)).toBeLessThan(100);
    await userEvent.click(zoom().getByRole("button", { name: "Zoom in" }));
    await userEvent.click(zoom().getByRole("button", { name: "Fit to view" }));
    expect(zoom().getByText(/%$/).textContent).toBe(first);
  });

  it("REQ-UI-077 Fit a tall graph: fitWidth looks at the width only and stays within 40%-200%", () => {
    expect(fitWidth(100, 1000)).toBe(1);
    expect(fitWidth(1000, 500)).toBe(0.5);
    expect(fitWidth(1000, 10)).toBe(0.4);
    expect(fitWidth(0, 500)).toBe(1);
    expect(fitWidth(500, 0)).toBe(1);
  });

  it("REQ-UI-077 Fit a tall graph: a graph narrower than the canvas stays at 100% whatever its height", () => {
    box(5000, 100);
    show();
    expect(zoom().getByText("100%")).toBeInTheDocument();
  });

  it("REQ-UI-122 Wheel over the Graph view: the box is as tall as its graph, scrolls only sideways and a plain wheel is not prevented", () => {
    box(5000, 100);
    const g = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e")], "e", OFF);
    show(g);
    const canvas = screen.getByTestId("graph-canvas");
    for (const c of ["isolate", "overflow-x-auto", "overflow-y-hidden", "overscroll-x-contain"]) expect(canvas.classList.contains(c)).toBe(true);
    for (const c of ["overflow-auto", "overscroll-contain"]) expect(canvas.classList.contains(c)).toBe(false);
    expect(canvas.className).not.toContain("100dvh");
    const height = Number.parseFloat(canvas.style.height);
    expect(height).toBeGreaterThanOrEqual(place(g).height);
    expect(height).toBeLessThan(place(g).height + 40);
    expect(fireEvent.wheel(canvas, { deltaY: 600 })).toBe(true);
  });

  it("REQ-UI-122 Sideways: a horizontal wheel is not prevented, so the canvas moves and the page does not", () => {
    box(5000, 100);
    show();
    expect(fireEvent.wheel(screen.getByTestId("graph-canvas"), { deltaX: 200, deltaY: 0 })).toBe(true);
  });

  it("REQ-UI-077 the wheel zooms only with Ctrl or Cmd held", () => {
    box(5000, 5000);
    show();
    const canvas = screen.getByTestId("graph-canvas");
    expect(fireEvent.wheel(canvas, { deltaY: -100 })).toBe(true);
    expect(zoom().getByText("100%")).toBeInTheDocument();
    expect(fireEvent.wheel(canvas, { deltaY: 0, ctrlKey: true })).toBe(true);
    expect(zoom().getByText("100%")).toBeInTheDocument();
    expect(fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true })).toBe(false);
    expect(zoom().getByText("110%")).toBeInTheDocument();
    expect(fireEvent.wheel(canvas, { deltaY: 100, metaKey: true })).toBe(false);
    expect(zoom().getByText("100%")).toBeInTheDocument();
  });

  it("REQ-UI-049 a node with children reads n of m done; a click selects and a double click opens", async () => {
    const g = scopeGraph([epic("e-1", { child_counts: { total: 3, closed: 1, prep_total: 0, prep_closed: 0 } }), task("a", "e-1", [], { status: "closed" }), task("b", "e-1"), task("c", "e-1")], null, OFF);
    const calls = show(g);
    expect(node("e-1")).toHaveTextContent("1 of 3 done");
    await userEvent.click(node("e-1"));
    expect(calls.select).toHaveBeenCalledWith("e-1");
    await userEvent.dblClick(node("e-1"));
    expect(calls.open).toHaveBeenCalledWith("e-1");
  });

  it("REQ-UI-049 node with a prep task: 1 of 2 done, open icon, chip on p-1 only", () => {
    const g = scopeGraph(
      [epic("e-1", { child_counts: { total: 2, closed: 1, prep_total: 1, prep_closed: 0 } }), task("t-1", "e-1", [], { status: "closed" }), task("t-2", "e-1"), task("p-1", "e-1", [], { labels: ["prep", "prep:mockup"] })],
      null,
      OFF,
    );
    show(g);
    expect(node("e-1")).toHaveTextContent("1 of 2 done");
    expect(node("e-1").querySelector("svg")).not.toBeNull();
    cleanup();
    show(scopeGraph([epic("e-1"), task("t-1", "e-1"), task("t-2", "e-1"), task("p-1", "e-1", [], { labels: ["prep"] })], "e-1", OFF));
    expect(node("p-1")).toHaveTextContent("Prep");
    expect(node("t-1")).not.toHaveTextContent("Prep");
    expect(node("t-2")).not.toHaveTextContent("Prep");
  });

  it("REQ-UI-049 an epic with only prep children keeps the open icon and shows no n of m done", () => {
    show(scopeGraph([epic("e-1"), task("p-1", "e-1", [], { labels: ["prep"] })], null, OFF));
    expect(node("e-1")).not.toHaveTextContent("done");
    expect(node("e-1").querySelector("svg.lucide-layers")).not.toBeNull();
  });

  it("REQ-UI-054 the hidden list reads each arrow and the relations that make it", () => {
    const g = scopeGraph([epic("e-1"), epic("e-2"), task("x", "e-1"), task("y", "e-2", ["x"]), task("z", "e-2", ["x"])], null, OFF);
    show(g);
    const list = screen.getByRole("list", { name: "Dependencies" });
    expect(within(list).getByText("e-2 is blocked by e-1")).toBeInTheDocument();
    expect(within(list).getByText("y is blocked by x")).toBeInTheDocument();
    expect(screen.getByText("2 links")).toBeInTheDocument();
    cleanup();
    const noEdges = scopeGraph([epic("e-1"), task("t", "e-1")], "e-1", OFF);
    show(noEdges);
    expect(screen.queryByRole("list", { name: "Dependencies" })).toBeNull();
  });

  it("REQ-UI-052 arrows follow the arrows, Escape asks to reselect, one node in the tab order", async () => {
    const calls = show(scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a", "c"]), task("c", "e")], "e", OFF), "a");
    expect(screen.getAllByRole("button").filter((b) => b.dataset.node && b.tabIndex === 0)).toHaveLength(1);
    node("a").focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(node("b")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(node("a")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(node("c")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(calls.escape).toHaveBeenCalled();
  });

  it("REQ-UI-051 the chain of the selected node is highlighted and the rest dimmed", () => {
    show(undefined, "b");
    expect(node("b")).toHaveAttribute("aria-pressed", "true");
    expect(node("a")).toHaveAttribute("data-dimmed", "false");
    expect(node("c")).toHaveAttribute("data-dimmed", "true");
  });

  it("REQ-UI-048 long bead ID is truncated on a single line and title is displayed", () => {
    const longId = "gin-console-rm-more-harnesses";
    const g = scopeGraph([epic(longId, { title: "More harnesses long title" })], null, OFF);
    show(g);
    const btn = node(longId);
    expect(btn).toHaveClass("overflow-hidden");
    const idSpan = within(btn).getByTitle(longId);
    expect(idSpan).toHaveClass("truncate");
    expect(idSpan).toHaveClass("min-w-0");
    expect(within(btn).getByText("More harnesses long title")).toHaveClass("truncate");
  });
});
