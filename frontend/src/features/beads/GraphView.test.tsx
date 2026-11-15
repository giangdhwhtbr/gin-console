import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead, json, stubBeads } from "./beadFixtures";
import { parseFilters, type BeadFilters } from "./filters";
import { GraphView } from "./GraphView";

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
});
