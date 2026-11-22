import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Strand, strandSentence, toStrandCounts } from "./Strand";

afterEach(cleanup);

describe("Strand", () => {
  // REQ-UI-138 Scenario: Epic with seven tracks
  it("REQ-UI-138 draws seven beads in state order, the count and the accessible name", () => {
    const { container } = render(<Strand counts={{ done: 2, inProgress: 1, blocked: 1, ready: 3, deferred: 0 }} noun="tracks" />);
    const shapes = Array.from(container.querySelectorAll("g[data-bead] > g[data-shape]")).map((g) => g.getAttribute("data-shape"));
    expect(shapes).toEqual(["done", "done", "in_progress", "blocked", "ready", "ready", "ready"]);
    expect(screen.getByText("2/7")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 done, 1 in progress, 1 blocked, 3 ready of 7 tracks" })).toHaveAttribute("data-strand", "2/7");
  });

  // REQ-UI-138 Scenario: More than 16 tracks
  it("REQ-UI-138 draws one segment per state above 16 items, in proportion to the counts", () => {
    const { container } = render(<Strand counts={{ done: 11, inProgress: 1, blocked: 0, ready: 6, deferred: 1 }} noun="tracks" />);
    expect(container.querySelectorAll("g[data-bead]")).toHaveLength(0);
    const segments = Array.from(container.querySelectorAll("rect[data-segment]"));
    expect(segments.map((s) => s.getAttribute("data-segment"))).toEqual(["done", "inProgress", "ready", "deferred"]);
    const widths = segments.map((s) => Number(s.getAttribute("width")));
    // each state keeps 1px of the room, the rest is shared by count; the ready segment is outlined inside its slot, 1.5px narrower
    const unit = (widths[0] - 1) / 11;
    expect(widths[1] - 1).toBeCloseTo(unit, 5);
    expect(widths[2] + 1.5 - 1).toBeCloseTo(6 * unit, 5);
    expect(widths[3] + 1.5 - 1).toBeCloseTo(unit, 5);
    expect(screen.getByText("11/19")).toBeInTheDocument();
  });

  // REQ-UI-138 Scenario: No track
  it("REQ-UI-138 draws nothing when there is no track", () => {
    const { container } = render(<Strand counts={{ done: 0, inProgress: 0, blocked: 0, ready: 0, deferred: 0 }} noun="tracks" />);
    expect(container).toBeEmptyDOMElement();
  });

  // REQ-UI-138 Scenario: Large strand on the epic page
  it("REQ-UI-138 the large strand spells the states out and shows no slash", () => {
    const { container } = render(<Strand size="lg" counts={{ done: 4, inProgress: 1, blocked: 1, ready: 2, deferred: 0 }} noun="tracks" />);
    expect(container.querySelectorAll("g[data-bead]")).toHaveLength(8);
    expect(screen.getByRole("img")).toHaveTextContent("4 done, 1 in progress, 1 blocked, 2 ready");
    expect(screen.getByRole("img")).not.toHaveTextContent("/");
  });

  // REQ-UI-138 Scenario: Narrow node
  it("REQ-UI-138 maxWidth: the beads when they fit, else the segmented thread in that width", () => {
    const seven = { done: 2, inProgress: 1, blocked: 1, ready: 3, deferred: 0 };
    const fits = render(<Strand counts={seven} noun="tracks" maxWidth={100} />);
    expect(fits.container.querySelectorAll("g[data-bead]")).toHaveLength(7);
    cleanup();
    const { container } = render(<Strand counts={seven} noun="tracks" maxWidth={72} />);
    expect(container.querySelectorAll("g[data-bead]")).toHaveLength(0);
    expect(container.querySelectorAll("rect[data-segment]")).toHaveLength(4);
    expect(container.querySelector("svg")).toHaveAttribute("width", "72");
    expect(screen.getByText("2/7")).toBeInTheDocument();
  });

  it("REQ-UI-138 above 16 items the thread keeps its width unless maxWidth is smaller", () => {
    const many = { done: 11, inProgress: 1, blocked: 0, ready: 6, deferred: 1 };
    expect(render(<Strand counts={many} noun="tracks" maxWidth={500} />).container.querySelector("svg")).toHaveAttribute("width", "120");
    cleanup();
    expect(render(<Strand counts={many} noun="tracks" maxWidth={72} />).container.querySelector("svg")).toHaveAttribute("width", "72");
  });

  it("REQ-UI-138 the large strand capped at 280px: 12 beads become a segmented thread of 280px, 8 stay beads", () => {
    const twelve = { done: 3, inProgress: 0, blocked: 0, ready: 9, deferred: 0 };
    expect(render(<Strand size="lg" counts={twelve} noun="tracks" />).container.querySelectorAll("g[data-bead]")).toHaveLength(12);
    cleanup();
    const capped = render(<Strand size="lg" counts={twelve} noun="tracks" maxWidth={280} />);
    expect(capped.container.querySelectorAll("rect[data-segment]")).toHaveLength(2);
    expect(capped.container.querySelector("svg")).toHaveAttribute("width", "280");
    cleanup();
    const eight = render(<Strand size="lg" counts={{ done: 4, inProgress: 1, blocked: 1, ready: 2, deferred: 0 }} noun="tracks" maxWidth={280} />);
    expect(eight.container.querySelectorAll("g[data-bead]")).toHaveLength(8);
  });

  it("REQ-UI-138 a state of 1 item in 1000 keeps a segment of at least 1px, and the thread stays within its width", () => {
    const { container } = render(<Strand counts={{ done: 999, inProgress: 1, blocked: 0, ready: 0, deferred: 0 }} noun="tracks" />);
    const widths = Array.from(container.querySelectorAll("rect[data-segment]")).map((r) => Number(r.getAttribute("width")));
    expect(widths).toHaveLength(2);
    expect(widths[1]).toBeGreaterThanOrEqual(1);
    expect(widths[0] + 2 + widths[1]).toBeCloseTo(120, 5);
  });

  it("REQ-UI-138 the sentence leaves out the states counted 0", () => {
    expect(strandSentence({ done: 0, inProgress: 0, blocked: 0, ready: 2, deferred: 0 }, "epics")).toBe("2 ready of 2 epics");
  });
});

describe("toStrandCounts", () => {
  it("REQ-UI-138 takes Ready from what the other states leave of the total", () => {
    expect(toStrandCounts({ total: 5, closed: 2 })).toEqual({ done: 2, inProgress: 0, blocked: 0, ready: 3, deferred: 0 });
    expect(toStrandCounts({ total: 5, closed: 2, in_progress: 1, blocked: 1 })).toMatchObject({ ready: 1 });
  });

  it("REQ-UI-138 never gives a negative count from inconsistent input", () => {
    const c = toStrandCounts({ total: 2, closed: 3, in_progress: 2, blocked: -1, ready: undefined, deferred: 1 });
    expect(Object.values(c).every((n) => n >= 0)).toBe(true);
    expect(c.ready).toBe(0);
  });
});
