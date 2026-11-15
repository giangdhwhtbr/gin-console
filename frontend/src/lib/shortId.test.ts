import { describe, expect, it } from "vitest";
import { shortId } from "./shortId";

describe("shortId", () => {
  it("REQ-UI-107 a long id keeps its first 14 and last 9 characters around an ellipsis", () => {
    expect(shortId("ex-payments-provider-migration-and-reconciliation-2026.2.1")).toBe("ex-payments-pr…-2026.2.1");
  });

  it("REQ-UI-107 a short id is unchanged", () => {
    expect(shortId("ex-e4.1")).toBe("ex-e4.1");
  });

  it("REQ-UI-107 a 24-character id is unchanged and a 25-character id becomes 24 characters", () => {
    expect(shortId("a".repeat(24))).toBe("a".repeat(24));
    expect(shortId("a".repeat(25))).toHaveLength(24);
  });
});
