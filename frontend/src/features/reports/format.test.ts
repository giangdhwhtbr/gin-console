import { describe, expect, it } from "vitest";
import { estimateDiff } from "./format";

describe("estimateDiff", () => {
  it("REQ-UI-090 estimate chip", () => {
    expect(estimateDiff(5, 7)).toEqual({ text: "+2 d", late: true });
    expect(estimateDiff(5, 3)).toEqual({ text: "−2 d", late: false });
    expect(estimateDiff(5, 4.5)).toEqual({ text: "−0.5 d", late: false });
    expect(estimateDiff(4.5, 4.5)).toEqual({ text: "on estimate", late: false });
    expect(estimateDiff(5, 4.96)).toEqual({ text: "on estimate", late: false });
  });
});
