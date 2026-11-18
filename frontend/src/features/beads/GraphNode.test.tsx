import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import { GraphNodeButton } from "./GraphNode";

afterEach(cleanup);

describe("GraphNodeButton state label", () => {
  it("REQ-UI-107 the label text can end with an ellipsis and keeps its full text as title", () => {
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
    expect(label.closest("[data-state]")).toHaveAttribute("title", "In progress");
    // every ancestor up to the node must be able to shrink, or the ellipsis never draws
    expect(label.closest("[data-state]")).toHaveClass("min-w-0");
    expect(label.closest("[data-state]")?.parentElement).toHaveClass("min-w-0", "flex");
    expect(screen.getByText("2 of 5 done")).toBeInTheDocument();
  });
});
