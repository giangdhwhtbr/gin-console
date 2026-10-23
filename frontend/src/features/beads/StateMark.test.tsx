import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { StateMark, stateEdge } from "./StateMark";

afterEach(cleanup);

describe("StateMark", () => {
  it.each([
    [bead("a", { ready: true }), "Ready", "ready"],
    [bead("b", { status: "in_progress" }), "In progress", "in_progress"],
    [bead("c", { blocked: true }), "Blocked", "blocked"],
    [bead("d", { status: "closed" }), "Done", "done"],
    [bead("e", { status: "deferred" }), "Deferred", "deferred"],
  ])("REQ-UI-064 %# shows %s", (item, label, state) => {
    render(<StateMark bead={item} />);
    expect(screen.getByText(label)).toHaveAttribute("data-state", state);
  });

  it("REQ-UI-064 the edge is 4px wide in the colour of the state", () => {
    expect(stateEdge("blocked")).toBe("border-l-4 border-l-state-blocked");
    expect(stateEdge("in_progress")).toBe("border-l-4 border-l-state-progress");
  });
});
