import { describe, expect, it } from "vitest";
import { fitWidth, ZOOM } from "./useZoom";

describe("fitWidth", () => {
  it("REQ-UI-077 Fit: a graph wider than the box is scaled to the box width", () => {
    expect(fitWidth(1000, 500)).toBe(0.5);
  });

  it("REQ-UI-077 Fit a tall graph: a narrow graph stays at 100% and never grows", () => {
    expect(fitWidth(300, 1200)).toBe(1);
  });

  it("REQ-UI-077 Limits: the scale stays within 40% and 200%, and is 100% when a size is 0", () => {
    expect(fitWidth(10000, 100)).toBe(ZOOM.min);
    expect(fitWidth(0, 500)).toBe(1);
    expect(fitWidth(500, 0)).toBe(1);
  });
});
