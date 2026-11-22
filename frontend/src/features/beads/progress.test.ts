import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { prepLabel, prepWords, progressOf } from "./progress";

// REQ-UI-130
describe("progress", () => {
  const e = bead("e", { child_counts: { total: 5, closed: 3, prep_total: 3, prep_closed: 1 } });

  it("REQ-UI-130 progressOf reads the child counts of the bead", () => {
    expect(progressOf(e)).toEqual({ done: 3, total: 5, prepDone: 1, prepTotal: 3 });
  });

  it("REQ-UI-130 prepLabel is x/y and prepWords says x of y done", () => {
    expect(prepLabel(progressOf(e))).toBe("Prep 1/3");
    expect(prepWords(progressOf(e))).toBe("Prep 1 of 3 done");
  });

  it("REQ-UI-130 a bead without children has zero progress", () => {
    expect(progressOf(bead("t"))).toEqual({ done: 0, total: 0, prepDone: 0, prepTotal: 0 });
  });
});
