import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bead, fakeChoose } from "./beadFixtures";
import { GraphNodeButton } from "./GraphNode";
import { MilestoneStatusProvider } from "./milestoneStatus";

afterEach(cleanup);

describe("GraphNodeButton state label", () => {
  it("REQ-UI-107 the label text can end with an ellipsis", () => {
    const node = { bead: bead("e-1", { status: "in_progress" }), external: false, layer: 0, order: 0, group: "layer" as const, hasKids: true, counts: { done: 2, inProgress: 0, blocked: 0, ready: 3, deferred: 0 } };
    render(
      <GraphNodeButton
        node={node}
        at={{ x: 0, y: 0 }}
        selected={false}
        dimmed={false}
        tabStop
        choose={fakeChoose()}
      />,
    );
    const label = screen.getByText("In progress");
    expect(label).toHaveClass("truncate");
    expect(label.closest("[data-state]")).not.toHaveAttribute("title");
    // every ancestor up to the node must be able to shrink, or the ellipsis never draws
    expect(label.closest("[data-state]")).toHaveClass("min-w-0");
    expect(label.closest("[data-state]")?.parentElement).toHaveClass("min-w-0", "flex");
    // REQ-UI-049
    expect(screen.getByRole("img", { name: "2 done, 3 ready of 5 tracks" })).toHaveTextContent("2/5");
  });
});

describe("GraphNodeButton narrow strand", () => {
  // REQ-UI-138 Scenario: Narrow node; REQ-UI-049
  it("REQ-UI-138 REQ-UI-049 a node with 12 tracks draws the segmented thread and the count in full", () => {
    const node = { bead: bead("e-5", { issue_type: "epic" }), external: false, layer: 0, order: 0, group: "layer" as const, hasKids: true, counts: { done: 3, inProgress: 0, blocked: 0, ready: 9, deferred: 0 } };
    const { container } = render(<GraphNodeButton node={node} at={{ x: 0, y: 0 }} selected={false} dimmed={false} tabStop choose={fakeChoose()} />);
    const strand = container.querySelector("[data-strand]");
    expect(strand).toHaveAttribute("data-strand", "3/12");
    expect(strand).toHaveTextContent("3/12");
    expect(strand?.querySelectorAll("rect[data-segment]").length).toBeGreaterThan(0);
    expect(strand?.querySelectorAll("g[data-bead]")).toHaveLength(0);
    expect(Number(strand?.querySelector("svg")?.getAttribute("width"))).toBeLessThanOrEqual(72);
  });
});

const place = (b: ReturnType<typeof bead>, showLane?: boolean) => {
  const node = { bead: b, external: false, layer: 0, order: 0, group: "layer" as const, hasKids: false, counts: { done: 0, inProgress: 0, blocked: 0, ready: 0, deferred: 0 } };
  render(
    <GraphNodeButton node={node} at={{ x: 0, y: 0 }} selected={false} dimmed={false} tabStop choose={fakeChoose()} showLane={showLane} />,
  );
};

describe("GraphNodeButton lanes", () => {
  it("REQ-UI-115 Chip in every view: a track shows its lane chip, and showLane false hides it", () => {
    place(bead("t-1", { lane: "be" }));
    expect(screen.getByText("be")).toBeInTheDocument();
    cleanup();
    place(bead("t-1", { lane: "be" }), false);
    expect(screen.queryByText("be")).toBeNull();
    cleanup();
    place(bead("t-2"));
    expect(screen.queryByText("be")).toBeNull();
  });

  it("REQ-UI-116 Merge gate node: dashed, words and state, edge colour kept", () => {
    place(bead("g-1", { title: "external: be#2", waits_for: { plan: "p", number: 2, track_id: "t-2", lane: "be" } }));
    const node = screen.getByRole("button");
    expect(node).toHaveAttribute("title", "Waits for be #2 to merge");
    expect(node).toHaveClass("border-dashed");
    // REQ-UI-064 no coloured edge
    expect(node).not.toHaveClass("border-l-4");
    expect(screen.getByText("Waits for be #2 to merge")).toHaveClass("truncate");
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    cleanup();
    place(bead("g-1", { status: "closed", waits_for: { plan: "p", number: 7, track_id: null, lane: null } }));
    expect(screen.getByText("Waits for track 7 to merge")).toBeInTheDocument();
    expect(screen.getByText("Merged")).toBeInTheDocument();
  });
});

describe("GraphNodeButton milestone status", () => {
  // REQ-MILESTONE-UI-022 Graph node
  it("REQ-MILESTONE-UI-022 a milestone node reads its milestone status", () => {
    const node = { bead: bead("ex-m2", { issue_type: "milestone", status: "open", ready: true }), external: false, layer: 0, order: 0, group: "layer" as const, hasKids: false, counts: { done: 0, inProgress: 0, blocked: 0, ready: 0, deferred: 0 } };
    render(
      <MilestoneStatusProvider statuses={new Map([["ex-m2", "active" as const]])}>
        <GraphNodeButton node={node} at={{ x: 0, y: 0 }} selected={false} dimmed={false} tabStop choose={fakeChoose()} />
      </MilestoneStatusProvider>,
    );
    expect(screen.getByText("Active").closest("[data-status]")).toHaveAttribute("data-status", "active");
    expect(screen.queryByText("Ready")).toBeNull();
  });
});

describe("GraphNodeButton selection", () => {
  it("REQ-UI-148 Selected node: the identity wash and a 3px bar inside its left edge", () => {
    const node = { bead: bead("e-1", { status: "open" }), external: false, layer: 0, order: 0, group: "layer" as const, hasKids: false, counts: { done: 0, inProgress: 0, blocked: 0, ready: 0, deferred: 0 } };
    render(<GraphNodeButton node={node} at={{ x: 0, y: 0 }} selected dimmed={false} tabStop choose={fakeChoose()} />);
    const selected = screen.getByRole("button", { pressed: true });
    expect(selected).toHaveClass("bg-identity-wash", "shadow-[inset_3px_0_0_var(--identity)]");
    expect(selected).not.toHaveClass("ring-2");
  });
});
