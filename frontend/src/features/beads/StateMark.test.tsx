import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HintProvider } from "@/components/HintProvider";
import { DEFINITIONS } from "@/lib/definitions";
import { bead } from "./beadFixtures";
import { MilestoneStatusProvider } from "./milestoneStatus";
import { StateMark, StateWord } from "./StateMark";

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
    render(<HintProvider><StateMark bead={bead("b", { status: "in_progress" })} /></HintProvider>);
    const mark = screen.getByText("In progress").closest("[data-state]");
    expect(mark).not.toHaveAttribute("title");
    expect(document.getElementById(mark?.getAttribute("aria-describedby") ?? "")).toHaveTextContent(DEFINITIONS.inProgress);
  });

  it("REQ-UI-064 the mark draws the glyph of its state before the word", () => {
    render(<StateMark bead={bead("c", { blocked: true })} />);
    expect(screen.getByText("Blocked").closest("[data-state]")?.querySelector('svg[data-glyph="blocked"]')).not.toBeNull();
  });

  it("REQ-UI-064 StateWord draws the same glyph", () => {
    render(<StateWord state="in_progress" words="Working" />);
    expect(screen.getByText("Working").closest("[data-state]")?.querySelector('svg[data-glyph="in_progress"]')).not.toBeNull();
  });

  it("REQ-UI-112 StateWord draws the state's colour with the given words", () => {
    render(<StateWord state="blocked" words="Waiting for be" />);
    const word = screen.getByText("Waiting for be").closest("[data-state]");
    expect(word).toHaveAttribute("data-state", "blocked");
    expect(word?.className).toContain("text-state-blocked");
  });

  it("REQ-UI-110 StateWord is capped to its container so the words end with an ellipsis and keep the title", () => {
    render(<HintProvider><StateWord state="done" words="All tracks closed" /></HintProvider>);
    const word = screen.getByText("All tracks closed");
    expect(word).toHaveClass("truncate");
    expect(word.parentElement).toHaveClass("max-w-full", "min-w-0");
    expect(word.parentElement).not.toHaveAttribute("title");
    expect(document.getElementById(word.parentElement?.getAttribute("aria-describedby") ?? "")).toHaveTextContent(`All tracks closed. ${DEFINITIONS.done}`);
  });

  it("REQ-MILESTONE-UI-022 a milestone bead draws its milestone status; others and unknown milestones draw their state", () => {
    const statuses = new Map([["m-1", "scheduled" as const], ["t-1", "active" as const]]);
    const draw = (item: ReturnType<typeof bead>) =>
      render(
        <MilestoneStatusProvider statuses={statuses}>
          <StateMark bead={item} />
        </MilestoneStatusProvider>,
      );
    draw(bead("m-1", { issue_type: "milestone", ready: true }));
    expect(screen.getByText("Scheduled").closest("[data-status]")).toHaveAttribute("data-status", "scheduled");
    // REQ-UI-064 Scheduled uses the glyph of Ready
    expect(screen.getByText("Scheduled").closest("[data-status]")?.querySelector('svg[data-glyph="ready"]')).not.toBeNull();
    cleanup();
    draw(bead("m-9", { issue_type: "milestone", ready: true }));
    expect(screen.getByText("Ready")).toBeInTheDocument();
    cleanup();
    draw(bead("t-1", { ready: true }));
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it.each([
    ["planned", "deferred"],
    ["active", "in_progress"],
    ["closed", "done"],
  ])("REQ-UI-064 milestone status %s draws the glyph of %s", (status, glyph) => {
    render(
      <MilestoneStatusProvider statuses={new Map([["m-1", status as "planned" | "active" | "closed"]])}>
        <StateMark bead={bead("m-1", { issue_type: "milestone" })} />
      </MilestoneStatusProvider>,
    );
    expect(document.querySelector(`[data-status="${status}"] svg[data-glyph="${glyph}"]`)).not.toBeNull();
  });
});
