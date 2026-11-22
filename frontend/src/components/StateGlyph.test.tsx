import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StateGlyph, type GlyphState } from "./StateGlyph";

afterEach(cleanup);

const shape = (state: GlyphState, color?: string) => {
  const { container } = render(<StateGlyph state={state} color={color} />);
  const g = container.querySelector(`svg[data-glyph="${state}"] g[data-shape="${state}"]`);
  if (g === null) throw new Error("no glyph");
  return g;
};

describe("StateGlyph", () => {
  it("REQ-UI-064 ready is one hollow ring", () => {
    const g = shape("ready");
    expect(g.querySelectorAll("circle")).toHaveLength(1);
    expect(g.querySelector("circle")).toHaveAttribute("fill", "none");
    expect(g.querySelector("circle")).toHaveAttribute("stroke", "var(--state-ready)");
  });

  it("REQ-UI-064 in progress is a ring with a filled half", () => {
    const g = shape("in_progress");
    expect(g.querySelectorAll("circle")).toHaveLength(1);
    expect(g.querySelectorAll("path")).toHaveLength(1);
    expect(g.querySelector("path")).toHaveAttribute("fill", "var(--state-progress)");
  });

  it("REQ-UI-064 done is one filled bead", () => {
    const g = shape("done");
    expect(g.querySelectorAll("circle")).toHaveLength(1);
    expect(g.querySelector("circle")).toHaveAttribute("fill", "var(--state-done)");
    expect(g.querySelector("path")).toBeNull();
  });

  it("REQ-UI-064 blocked is a filled bead crossed by a bar in the surface colour", () => {
    const g = shape("blocked");
    expect(g.querySelectorAll("circle")).toHaveLength(1);
    expect(g.querySelector("path")).toHaveAttribute("stroke", "var(--card)");
  });

  it("REQ-UI-064 deferred is a dashed ring", () => {
    const g = shape("deferred");
    expect(g.querySelector("circle")).toHaveAttribute("stroke-dasharray");
  });

  it("REQ-UI-064 a colour prop overrides the state colour", () => {
    expect(shape("ready", "red").querySelector("circle")).toHaveAttribute("stroke", "red");
  });

  it("REQ-UI-064 the five states draw five distinct shapes", () => {
    const states: GlyphState[] = ["ready", "in_progress", "blocked", "done", "deferred"];
    const drawn = states.map((state) => {
      const html = shape(state).innerHTML;
      cleanup();
      return html;
    });
    expect(new Set(drawn).size).toBe(5);
  });
});
