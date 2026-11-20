import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { parseFilters } from "./filters";
import { scopeOf } from "./scope";

const m2 = bead("m2", { issue_type: "milestone" });
const e1 = bead("e1", { issue_type: "epic", parent: "m2" });
const t1 = bead("e1.1", { parent: "e1" });
const all = [m2, e1, t1];

describe("scopeOf", () => {
  it("REQ-UI-106 the scope bead when it has children", () => {
    expect(scopeOf(all, parseFilters("?scope=e1"), "all")).toBe("e1");
  });
  it("REQ-UI-106 a scope without children, or a milestone, falls back to the milestone in effect", () => {
    expect(scopeOf(all, parseFilters("?scope=e1.1"), "m2")).toBe("m2");
    expect(scopeOf(all, parseFilters("?scope=m2"), "all")).toBeNull();
    expect(scopeOf(all, parseFilters("?scope=zzz"), "m2")).toBe("m2");
  });
  it("REQ-UI-106 the project when nothing scopes", () => {
    expect(scopeOf(all, parseFilters(""), "all")).toBeNull();
    expect(scopeOf(all, parseFilters(""), "none")).toBeNull();
    expect(scopeOf(all, parseFilters(""), "m2")).toBe("m2");
  });
});
