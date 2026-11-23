import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  // REQ-UI-110 REQ-UI-137: `text-13` is a font size, so a text colour next to it survives the merge
  it("keeps a text colour next to the text-13 size", () => {
    expect(cn("text-13", "text-primary-foreground")).toBe("text-13 text-primary-foreground");
    expect(cn("text-primary-foreground", "text-13")).toBe("text-primary-foreground text-13");
  });

  it("lets text-13 replace another size", () => {
    expect(cn("text-sm", "text-13")).toBe("text-13");
  });
});
