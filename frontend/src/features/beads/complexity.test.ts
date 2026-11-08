import { describe, expect, it } from "vitest";
import { complexityOf } from "./complexity";

describe("complexityOf", () => {
  it("REQ-UI-028 reads the level from the Complexity line", () => {
    expect(complexityOf("Intro\nComplexity: high (cross-repo, new CLI)\nMore")).toBe("high");
    expect(complexityOf("complexity:   Low")).toBe("low");
    expect(complexityOf("Complexity: medium")).toBe("medium");
  });

  it("REQ-UI-028 is null without a valid line", () => {
    expect(complexityOf(null)).toBeNull();
    expect(complexityOf("No label here")).toBeNull();
    expect(complexityOf("Complexity: huge")).toBeNull();
    expect(complexityOf("See Complexity: high")).toBeNull();
    expect(complexityOf("Complexity: highest")).toBeNull();
  });
});
