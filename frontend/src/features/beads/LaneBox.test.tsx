import { cleanup, render, screen } from "@testing-library/react";
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
  meta: "ann · lease until 21 Nov 16:00 · 1/2 closed",
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
    expect(box.style.getPropertyValue("--box")).toBe("var(--lane-2)");
  });

  it("REQ-UI-118 Header: long text ends with an ellipsis and keeps a title", () => {
    render(<LaneBox box={{ ...base, lane: "a-very-long-lane-name" }} />);
    const name = screen.getByRole("heading", { name: "a-very-long-lane-name" });
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", "a-very-long-lane-name");
    expect(screen.getByText(base.meta)).toHaveClass("truncate");
  });

  it("REQ-UI-118 No lane box: dashed, neutral, no swatch and no state", () => {
    render(<LaneBox box={{ ...base, lane: null, slot: 0, state: null, meta: "1/2 closed" }} />);
    const box = screen.getByRole("region", { name: "Lane No lane" });
    expect(box).toHaveClass("border-dashed");
    expect(box.querySelector("[data-swatch]")).toBeNull();
    expect(box).not.toHaveTextContent("Running");
    expect(box).toHaveTextContent("1/2 closed");
  });
});
