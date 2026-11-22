import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LaneBox } from "./LaneBox";
import type { LaneBoxLayout } from "./laneGraph";

const base: LaneBoxLayout = {
  lane: "be",
  slot: 2,
  tier: 0,
  x: 16,
  y: 16,
  w: 300,
  h: 150,
  state: { kind: "running", words: "Running" },
  meta: "ann, lease until 21 Nov 16:00",
  tracks: { closed: 1, total: 2, counts: { done: 1, inProgress: 1, blocked: 0, ready: 0, deferred: 0 } },
};

afterEach(cleanup);

describe("LaneBox", () => {
  it("REQ-UI-118 Header: swatch, name, state words and the muted line", () => {
    render(<LaneBox box={base} />);
    const box = screen.getByRole("region", { name: "Lane be" });
    expect(box.querySelector("[data-swatch]")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "be" })).toBeInTheDocument();
    expect(box).toHaveTextContent("Running");
    expect(screen.getByText(base.meta)).toHaveAttribute("title", base.meta);
    // REQ-UI-138 the strand of the lane's tracks follows the meta
    expect(within(box).getByRole("img", { name: "1 done, 1 in progress of 2 tracks" })).toHaveTextContent("1/2");
    expect(box.style.getPropertyValue("--box")).toBe("var(--lane-2)");
    expect(box.className).toContain("bg-[color-mix(in_srgb,var(--box)_9%,var(--card))]");
    expect(box.className).toContain("dark:bg-[color-mix(in_srgb,var(--box)_16%,var(--card))]");
    expect(box.className).toContain("border-[color-mix(in_srgb,var(--box)_55%,transparent)]");
    expect(box.className).toContain("dark:border-[color-mix(in_srgb,var(--box)_60%,transparent)]");
  });

  // REQ-UI-138 Scenario: Narrow node
  it("REQ-UI-138 REQ-UI-118 a box with 12 tracks draws the segmented thread and the count in full", () => {
    const tracks = { closed: 3, total: 12, counts: { done: 3, inProgress: 0, blocked: 0, ready: 9, deferred: 0 } };
    const { container } = render(<LaneBox box={{ ...base, tracks }} />);
    const strand = container.querySelector("[data-strand]");
    expect(strand).toHaveAttribute("data-strand", "3/12");
    expect(strand).toHaveTextContent("3/12");
    expect(strand?.querySelectorAll("rect[data-segment]").length).toBeGreaterThan(0);
    expect(strand?.querySelectorAll("g[data-bead]")).toHaveLength(0);
    expect(Number(strand?.querySelector("svg")?.getAttribute("width"))).toBeLessThanOrEqual(96);
  });

  it("REQ-UI-118 Header: long text ends with an ellipsis and keeps a title", () => {
    render(<LaneBox box={{ ...base, lane: "a-very-long-lane-name" }} />);
    const name = screen.getByRole("heading", { name: "a-very-long-lane-name" });
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", "a-very-long-lane-name");
    expect(screen.getByText(base.meta)).toHaveClass("truncate");
  });

  it("REQ-UI-118 No lane box: dashed, neutral, no swatch and no state", () => {
    render(<LaneBox box={{ ...base, lane: null, slot: 0, state: null, meta: "" }} />);
    const box = screen.getByRole("region", { name: "Lane No lane" });
    expect(box).toHaveClass("border-dashed", "border-muted-foreground");
    expect(box.className).not.toContain("color-mix");
    expect(box.querySelector("[data-swatch]")).toBeNull();
    expect(box).not.toHaveTextContent("Running");
    expect(within(box).getByRole("img", { name: /of 2 tracks/ })).toHaveTextContent("1/2");
  });
});
