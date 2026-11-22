import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DEFINITIONS } from "@/lib/definitions";
import { bead } from "./beadFixtures";
import { StateMark, StateWord, stateEdge } from "./StateMark";

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
    expect(screen.getByText(label).closest("[data-state]")).toHaveAttribute("data-state", state);
  });

  it("REQ-UI-132 the mark has no title; its hint says what the state means", () => {
    render(<StateMark bead={bead("b", { status: "in_progress" })} />);
    const mark = screen.getByText("In progress").closest("[data-state]");
    expect(mark).not.toHaveAttribute("title");
    expect(document.getElementById(mark?.getAttribute("aria-describedby") ?? "")).toHaveTextContent(DEFINITIONS.inProgress);
  });

  it("REQ-UI-064 the edge is 4px wide in the colour of the state", () => {
    expect(stateEdge("blocked")).toBe("border-l-4 border-l-state-blocked");
    expect(stateEdge("in_progress")).toBe("border-l-4 border-l-state-progress");
  });

  it("REQ-UI-112 StateWord draws the state's colour with the given words", () => {
    render(<StateWord state="blocked" words="Waiting for be" />);
    const word = screen.getByText("Waiting for be").closest("[data-state]");
    expect(word).toHaveAttribute("data-state", "blocked");
    expect(word?.className).toContain("text-state-blocked");
  });

  it("REQ-UI-110 StateWord is capped to its container so the words end with an ellipsis and keep the title", () => {
    render(<StateWord state="done" words="All tracks closed" />);
    const word = screen.getByText("All tracks closed");
    expect(word).toHaveClass("truncate");
    expect(word.parentElement).toHaveClass("max-w-full", "min-w-0");
    expect(word.parentElement).not.toHaveAttribute("title");
    expect(document.getElementById(word.parentElement?.getAttribute("aria-describedby") ?? "")).toHaveTextContent(`All tracks closed. ${DEFINITIONS.done}`);
  });
});
