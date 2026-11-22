import { describe, expect, it } from "vitest";
import { isPrep } from "./prep";

describe("prep", () => {
  it("REQ-BEADS-002 a prep task has the prep label and no track: or req: label", () => {
    expect(isPrep(["prep", "prep:mockup"])).toBe(true);
    expect(isPrep(["prep", "track:api"])).toBe(false);
    expect(isPrep(["prep", "req:REQ-1"])).toBe(false);
    expect(isPrep(["prep:mockup"])).toBe(false);
    expect(isPrep([])).toBe(false);
  });
});
