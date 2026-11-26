import { describe, expect, it } from "vitest";
import { matching, parseFilters, withFilters } from "./filters";
import { requirement, signoff } from "./fixtures";

const rows = [
  requirement({ id: "REQ-UI-001", title: "Matrix Shown", capability: "ui", status: "untested" }),
  requirement({ id: "REQ-UI-002", title: "Other", capability: "ui", status: "covered", signoff: signoff({ state: "current" }) }),
  requirement({ id: "REQ-AUTH-001", title: "Login", capability: "auth", status: "untested" }),
  requirement({ id: "REQ-AUTH-002", title: "Gone", capability: "auth", status: null, state: "removed" }),
];

describe("filters", () => {
  it("REQ-REQUIREMENTS-014 ignores unknown values", () => {
    expect(parseFilters("?status=bogus&signoff=nope&removed=2")).toEqual({ status: null, capability: null, signoff: null, q: "", removed: false });
  });
  it("REQ-REQUIREMENTS-014 round-trips and keeps project and req", () => {
    const filters = { status: "untested", capability: "ui", signoff: "current", q: "x y", removed: true } as const;
    const search = withFilters("?project=a&req=REQ-UI-001", filters);
    expect(parseFilters(search)).toEqual(filters);
    expect(new URLSearchParams(search).get("project")).toBe("a");
    expect(new URLSearchParams(search).get("req")).toBe("REQ-UI-001");
    expect(withFilters(search, { status: null, capability: null, signoff: null, q: "", removed: false })).toBe("?project=a&req=REQ-UI-001");
  });
  it("REQ-REQUIREMENTS-014 lists only untested requirements of ui for a shared link", () => {
    const found = matching(rows, parseFilters("?project=a&status=untested&capability=ui"));
    expect(found.map((r) => r.id)).toEqual(["REQ-UI-001"]);
  });
  it("REQ-REQUIREMENTS-014 matches the text on id and title ignoring case, and all filters together", () => {
    expect(matching(rows, parseFilters("?q=matrix")).map((r) => r.id)).toEqual(["REQ-UI-001"]);
    expect(matching(rows, parseFilters("?q=req-auth")).map((r) => r.id)).toEqual(["REQ-AUTH-001"]);
    expect(matching(rows, parseFilters("?signoff=current&status=untested"))).toEqual([]);
  });
  it("REQ-REQUIREMENTS-014 hides removed rows unless asked", () => {
    expect(matching(rows, parseFilters("")).map((r) => r.id)).not.toContain("REQ-AUTH-002");
    expect(matching(rows, parseFilters("?removed=1")).map((r) => r.id)).toContain("REQ-AUTH-002");
  });
  it("REQ-REQUIREMENTS-014 ignores a capability no row has", () => {
    expect(matching(rows, parseFilters("?capability=zzz"))).toHaveLength(3);
  });
});
