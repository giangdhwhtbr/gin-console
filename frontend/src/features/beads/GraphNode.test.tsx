import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import { GraphNodeButton } from "./GraphNode";
import { MilestoneStatusProvider } from "./milestoneStatus";

afterEach(cleanup);

describe("GraphNodeButton state label", () => {
  it("REQ-UI-107 the label text can end with an ellipsis", () => {
    const node = { bead: bead("e-1", { status: "in_progress" }), external: false, layer: 0, order: 0, group: "layer" as const, hasKids: true, done: 2, total: 5 };
    render(
      <GraphNodeButton
        node={node}
        at={{ x: 0, y: 0 }}
        selected={false}
        dimmed={false}
        tabStop
        onSelect={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    const label = screen.getByText("In progress");
    expect(label).toHaveClass("truncate");
    expect(label.closest("[data-state]")).not.toHaveAttribute("title");
    // every ancestor up to the node must be able to shrink, or the ellipsis never draws
    expect(label.closest("[data-state]")).toHaveClass("min-w-0");
    expect(label.closest("[data-state]")?.parentElement).toHaveClass("min-w-0", "flex");
    expect(screen.getByText("2 of 5 done")).toBeInTheDocument();
  });
});

const place = (b: ReturnType<typeof bead>, showLane?: boolean) => {
  const node = { bead: b, external: false, layer: 0, order: 0, group: "layer" as const, hasKids: false, done: 0, total: 0 };
  render(
    <GraphNodeButton node={node} at={{ x: 0, y: 0 }} selected={false} dimmed={false} tabStop onSelect={vi.fn()} onOpen={vi.fn()} showLane={showLane} />,
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
    const node = { bead: bead("ex-m2", { issue_type: "milestone", status: "open", ready: true }), external: false, layer: 0, order: 0, group: "layer" as const, hasKids: false, done: 0, total: 0 };
    render(
      <MilestoneStatusProvider statuses={new Map([["ex-m2", "active" as const]])}>
        <GraphNodeButton node={node} at={{ x: 0, y: 0 }} selected={false} dimmed={false} tabStop onSelect={vi.fn()} onOpen={vi.fn()} />
      </MilestoneStatusProvider>,
    );
    expect(screen.getByText("Active").closest("[data-status]")).toHaveAttribute("data-status", "active");
    expect(screen.queryByText("Ready")).toBeNull();
  });
});
