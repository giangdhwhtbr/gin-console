import { describe, expect, it } from "vitest";
import { mockupFileHref } from "./paths";

describe("mockupFileHref", () => {
  it("REQ-AUTH-016 uses the grant path with a grant", () => {
    expect(mockupFileHref("a", "ui", "2026-11-22", "css/style.css", "g/1 x")).toBe(
      "/api/requirements/mockups/a/g/g%2F1%20x/files/ui/2026-11-22/css/style.css",
    );
  });

  it("REQ-AUTH-016 keeps today's path with a null grant", () => {
    expect(mockupFileHref("a", "ui", "2026-11-22", "css/style.css", null)).toBe("/api/requirements/mockups/a/files/ui/2026-11-22/css/style.css");
  });
});
