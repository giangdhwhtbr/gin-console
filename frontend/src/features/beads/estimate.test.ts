import { describe, expect, it } from "vitest";
import { daysOf, estimateText } from "./estimate";

describe("estimate", () => {
  it("REQ-UI-109 counts 480 minutes as one working day, to one decimal", () => {
    expect(estimateText(480)).toBe("1d");
    expect(estimateText(240)).toBe("0.5d");
    expect(estimateText(1440)).toBe("3d");
    expect(daysOf(500)).toBe(1);
    expect(daysOf(530)).toBe(1.1);
  });

  it("REQ-UI-109 no estimate gives no text", () => {
    expect(estimateText(null)).toBeNull();
  });
});
