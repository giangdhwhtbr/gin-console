import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead, json, stubBeads } from "./beadFixtures";
import { parseFilters, type BeadFilters } from "./filters";
import { GraphView } from "./GraphView";
import { e12, g2 } from "./laneFixtures";

const m2 = bead("m2", { issue_type: "milestone" });
const e1 = bead("e1", { issue_type: "epic", parent: "m2", milestone: "m2" });
const t1 = bead("e1.1", { parent: "e1", milestone: "m2", assignee: "bao" });
const e2 = bead("e2", { issue_type: "epic", parent: "m2", milestone: "m2", blocked_by: ["x"] });
const x = bead("x", { issue_type: "epic", milestone: "m3" });
const all = [m2, e1, t1, e2, x];
const noMilestones = all.filter((b) => b.issue_type !== "milestone");

function view(
  over: { beads?: BeadSummary[]; matched?: BeadSummary[]; milestone?: string; filters?: Partial<BeadFilters> } = {},
) {
  const onChange = vi.fn();
  const filters = { ...parseFilters("?view=graph"), ...over.filters };
  stubBeads(() => json([]));
  render(
    <GraphView
      project="p"
      beads={over.beads ?? all}
      matched={over.matched ?? noMilestones}
      milestone={over.milestone ?? "all"}
      filters={filters}
      onChange={onChange}
    />,
  );
  return onChange;
}
function rerenderable(over: { milestone: string }) {
  const props = { project: "p", beads: all, matched: noMilestones, milestone: over.milestone, filters: parseFilters("?view=graph"), onChange: vi.fn() };
  stubBeads(() => json([]));
  const { rerender } = render(<GraphView {...props} />);
  return { props, rerender: (next: typeof props) => rerender(<GraphView {...next} />) };
}
const node = (id: string) => screen.queryByRole("button", { name: new RegExp(`^${id}`) });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GraphView", () => {
  it("REQ-UI-106 milestone scope: its epics, and an outside blocker dashed with an arrow", () => {
    view({ milestone: "m2" });
    expect(node("e1")).toBeInTheDocument();
    expect(node("e2")).toBeInTheDocument();
    expect(node("x")?.className).toContain("border-dashed");
    expect(screen.getByText("Dashed nodes are outside this milestone.")).toBeInTheDocument();
  });

  it("REQ-UI-106 project scope: top-level beads, Only linked on", () => {
    view();
    expect(screen.getByRole("switch", { name: "Only linked" })).toBeChecked();
    expect(node("m2")).toBeNull();
    expect(node("x")).toBeInTheDocument();
    expect(node("e1")).toBeNull();
    expect(screen.getByText("1 without dependencies")).toBeInTheDocument();
  });

  it("REQ-UI-106 filters apply to the nodes", () => {
    view({ milestone: "m2", matched: [t1] });
    expect(node("e1")).toBeInTheDocument();
    expect(node("e2")).toBeNull();
  });

  it("REQ-UI-106 nothing matches", () => {
    view({ milestone: "m2", matched: [] });
    expect(screen.getByText("No beads match these filters")).toBeInTheDocument();
  });

  it("REQ-UI-106 drill down to an epic and back to the milestone", async () => {
    const onChange = view({ milestone: "m2" });
    await userEvent.dblClick(node("e1")!);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "e1", select: "" }));
    cleanup();
    const back = view({ milestone: "m2", filters: { scope: "e1" } });
    const trail = screen.getByRole("navigation", { name: "Graph scope" });
    expect(within(trail).getAllByRole("button").map((b) => b.textContent)).toEqual(["m2", "e1"]);
    await userEvent.click(within(trail).getByRole("button", { name: "m2" }));
    expect(back).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "" }));
    expect(node("e1.1")).toBeInTheDocument();
  });

  it("REQ-UI-106 opening a bead without children goes to its page", async () => {
    view({ milestone: "m2", filters: { scope: "e1" } });
    await userEvent.dblClick(node("e1.1")!);
    expect(window.location.pathname).toBe("/beads/p/e1.1");
  });

  it("REQ-UI-081 selecting a node sets select; the details panel shows the bead", async () => {
    const onChange = view({ milestone: "m2" });
    await userEvent.click(node("e1")!);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: "e1" }));
    cleanup();
    view({ milestone: "m2", filters: { select: "e1" } });
    expect(screen.getByRole("complementary", { name: "Bead details" })).toBeInTheDocument();
    expect(node("e1")).toHaveAttribute("aria-pressed", "true");
  });

  it("REQ-UI-106 the trail skips milestone beads; the project item returns to the project scope", async () => {
    const onChange = view({ milestone: "all", filters: { scope: "e1" } });
    const trail = screen.getByRole("navigation", { name: "Graph scope" });
    expect(within(trail).getAllByRole("button").map((b) => b.textContent)).toEqual(["p", "e1"]);
    await userEvent.click(within(trail).getByRole("button", { name: "p" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "" }));
  });

  it("REQ-UI-106 a scope naming another milestone is ignored", () => {
    view({ milestone: "m2", beads: [...all, bead("m3", { issue_type: "milestone" }), bead("e5", { parent: "m3", milestone: "m3" })], filters: { scope: "m3" } });
    expect(node("e1")).toBeInTheDocument();
    expect(node("e5")).toBeNull();
  });

  it("REQ-UI-106 the search applied in the other views narrows the graph", () => {
    view({ milestone: "m2", matched: [e2], filters: { q: "e2" } });
    expect(node("e2")).toBeInTheDocument();
    expect(node("e1")).toBeNull();
  });

  it("REQ-UI-106 Only linked is off on a milestone scope and on again at the project scope", () => {
    const { rerender, props } = rerenderable({ milestone: "m2" });
    expect(screen.getByRole("switch", { name: "Only linked" })).not.toBeChecked();
    rerender({ ...props, milestone: "all" });
    expect(screen.getByRole("switch", { name: "Only linked" })).toBeChecked();
  });

  it("REQ-UI-106 No panel on opening an epic: neither the project nor a milestone scope opens the panel", () => {
    view();
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
    expect(screen.getByRole("switch", { name: "Only linked" }).closest(".grid")?.className).not.toContain("lg:grid-cols");
    cleanup();
    view({ milestone: "m2" });
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
    expect(screen.getByRole("switch", { name: "Only linked" }).closest(".grid")?.className).not.toContain("lg:grid-cols");
    cleanup();
    view({ milestone: "m2", filters: { select: "e1" } });
    const panel = screen.getByRole("complementary", { name: "Bead details" });
    expect(panel.closest(".grid")?.className).toContain("lg:grid-cols");
  });

  it("REQ-UI-051 close writes select=none and focus returns to the node", async () => {
    const props = { project: "p", beads: all, matched: noMilestones, milestone: "m2", filters: parseFilters("?view=graph&select=e1"), onChange: vi.fn() };
    stubBeads(() => json([]));
    const { rerender } = render(<GraphView {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(props.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: "none" }));
    rerender(<GraphView {...props} filters={{ ...props.filters, select: "none" }} />);
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
    expect(node("e1")).toHaveFocus();
  });

  it("REQ-UI-052 Escape with a selection goes to no selection", async () => {
    const onChange = view({ milestone: "m2", filters: { select: "e1" } });
    node("e1")!.focus();
    await userEvent.keyboard("{Escape}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: "none" }));
  });

  it("REQ-UI-052 Escape on the project scope closes", async () => {
    const onChange = view({ filters: { select: "x" } });
    node("x")!.focus();
    await userEvent.keyboard("{Escape}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: "none" }));
  });

  it("REQ-UI-051 the breadcrumb resets select to the new scope's default", async () => {
    const onChange = view({ milestone: "m2", filters: { scope: "e1", select: "none" } });
    await userEvent.click(within(screen.getByRole("navigation", { name: "Graph scope" })).getByRole("button", { name: "m2" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "", select: "" }));
  });
});

describe("GraphView merge gates", () => {
  it("REQ-UI-116 Merge gate node: the Graph draws the gate as a gate node", () => {
    const gate = bead("g1", { title: "external: p#2", waits_for: { plan: "p", number: 2, track_id: null, lane: null } });
    const waiting = bead("w1", { blocked_by: ["g1"] });
    view({ beads: [...all, gate, waiting], matched: [...noMilestones, gate, waiting] });
    const found = node("g1");
    expect(found).toHaveClass("border-dashed");
    expect(found).toHaveTextContent("Waits for track 2 to merge");
  });

  it("REQ-UI-117 Boxes in tiers: a scope with lanes draws a box per lane, no gate node and no Only linked", () => {
    view({ beads: e12, matched: e12, filters: { scope: "ex-e12", closed: true } });
    expect(screen.getByRole("region", { name: "Lane be" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lane qa" })).toBeInTheDocument();
    expect(node(g2.id)).toBeNull();
    expect(screen.queryByRole("switch", { name: "Only linked" })).toBeNull();
  });

  it("REQ-UI-117 Scope without lanes: layers and Only linked as before", () => {
    view({ milestone: "m2" });
    expect(screen.queryByRole("region", { name: /^Lane / })).toBeNull();
    expect(screen.getByRole("switch", { name: "Only linked" })).toBeInTheDocument();
  });

  it("REQ-UI-117 filters leave out boxes with no drawn card", () => {
    view({ beads: e12, matched: e12.filter((b) => b.lane === "be" || b.lane === null && b.id === "ex-e12"), filters: { scope: "ex-e12", closed: true } });
    expect(screen.getByRole("region", { name: "Lane be" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Lane qa" })).toBeNull();
  });

  const lane = (n: number, name: string | null, over: Partial<BeadSummary> = {}) =>
    bead(`ex-l.${n}`, { parent: "ex-l", lane: name, track: { plan: "p", number: n }, ...over });
  const lanesView = (children: BeadSummary[]) => {
    const all2 = [bead("ex-l", { issue_type: "epic" }), ...children];
    view({ beads: all2, matched: all2, filters: { scope: "ex-l", closed: true } });
  };
  const box = (name: string) => screen.getByRole("region", { name: `Lane ${name}` });
  const left = (name: string) => Number.parseFloat(box(name).style.left);
  const top = (name: string) => Number.parseFloat(box(name).style.top);

  it("REQ-UI-117 Lanes in a loop: the boxes share a tier, both arrows are drawn and the cycle line names the lanes", () => {
    const a1 = lane(1, "a");
    const b1 = lane(2, "b", { blocked_by: [a1.id] });
    const a2 = lane(3, "a", { blocked_by: [b1.id] });
    lanesView([a1, b1, a2]);
    expect(left("a")).toBe(left("b"));
    expect(top("b")).toBeGreaterThan(top("a"));
    expect(document.querySelector(`[data-arrow="${a1.id}>${b1.id}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-arrow="${b1.id}>${a2.id}"]`)).not.toBeNull();
    const line = screen.getByRole("status");
    expect(line).toHaveTextContent(/^Dependency cycle between /);
    expect(line).toHaveTextContent("a");
    expect(line).toHaveTextContent("b");
  });

  it("REQ-UI-117 No lane box with dependencies: No lane sits in the tier to the right of be, with arrows to it and from it", () => {
    const be = lane(1, "be");
    const n = lane(2, null, { blocked_by: [be.id] });
    const qa = lane(3, "qa", { blocked_by: [n.id] });
    lanesView([be, n, qa]);
    expect(left("No lane")).toBeGreaterThan(left("be"));
    expect(left("qa")).toBeGreaterThan(left("No lane"));
    expect(document.querySelector(`[data-arrow="${be.id}>${n.id}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-arrow="${n.id}>${qa.id}"]`)).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(left("be")).toBeGreaterThanOrEqual(0);
  });
});
