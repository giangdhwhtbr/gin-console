import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import { fitScale, GraphCanvas } from "./GraphCanvas";
import { scopeGraph } from "./graph";

const OFF = { hideDone: false, onlyLinked: false };
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GraphCanvas", () => {
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
    box(300, 200);
    show();
    const first = zoom().getByText(/%$/).textContent;
    expect(Number.parseInt(first ?? "", 10)).toBeLessThan(100);
    await userEvent.click(zoom().getByRole("button", { name: "Zoom in" }));
    await userEvent.click(zoom().getByRole("button", { name: "Fit to view" }));
    expect(zoom().getByText(/%$/).textContent).toBe(first);
    expect(fitScale(100, 100, 1000, 1000)).toBe(1);
  });

  it("REQ-UI-077 the wheel zooms only with Ctrl or Cmd held", () => {
    box(5000, 5000);
    show();
    const canvas = screen.getByTestId("graph-canvas");
    fireEvent.wheel(canvas, { deltaY: -100 });
    expect(zoom().getByText("100%")).toBeInTheDocument();
    fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
    expect(zoom().getByText("110%")).toBeInTheDocument();
    fireEvent.wheel(canvas, { deltaY: 100, metaKey: true });
    expect(zoom().getByText("100%")).toBeInTheDocument();
  });

  it("REQ-UI-049 a node with children reads n of m done; a click selects and a double click opens", async () => {
    const g = scopeGraph([epic("e-1"), task("a", "e-1", [], { status: "closed" }), task("b", "e-1"), task("c", "e-1")], null, OFF);
    const calls = show(g);
    expect(node("e-1")).toHaveTextContent("1 of 3 done");
    await userEvent.click(node("e-1"));
    expect(calls.select).toHaveBeenCalledWith("e-1");
    await userEvent.dblClick(node("e-1"));
    expect(calls.open).toHaveBeenCalledWith("e-1");
  });

  it("REQ-UI-054 the hidden list reads each arrow and the relations that make it", () => {
    const g = scopeGraph([epic("e-1"), epic("e-2"), task("x", "e-1"), task("y", "e-2", ["x"]), task("z", "e-2", ["x"])], null, OFF);
    show(g);
    const list = screen.getByRole("list", { name: "Dependencies" });
    expect(within(list).getByText("e-2 is blocked by e-1")).toBeInTheDocument();
    expect(within(list).getByText("y is blocked by x")).toBeInTheDocument();
    expect(screen.getByText("2 links")).toBeInTheDocument();
  });

  it("REQ-UI-052 arrows follow the arrows, Escape asks to reselect, one node in the tab order", async () => {
    const calls = show(undefined, "a");
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
