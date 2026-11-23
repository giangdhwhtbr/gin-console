import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearOrigin, getOrigin, originFor, RETURN_KEY, rememberOpen, rememberOrigin, type Origin } from "@/app/origin";

const EMPTY: Origin = { kind: "beads", path: "/beads", search: "", project: null, label: null, milestone: null, open: {} };
const remembered = (search: string, project = "a") => rememberOrigin("beads", "/beads", search, project);

beforeEach(() => {
  window.sessionStorage.clear();
  clearOrigin();
});
afterEach(() => vi.restoreAllMocks());

describe("origin", () => {
  it("REQ-UI-073 remembers the search", () => {
    remembered("?project=a&view=board&status=open");
    expect(getOrigin().search).toBe("?project=a&view=board&status=open");
  });

  it("REQ-UI-074 remembers the open branches per project and keeps the search", () => {
    remembered("?project=a");
    rememberOpen("a", ["e-1"]);
    rememberOpen("b", ["x-1", "x-2"]);
    expect(getOrigin()).toEqual({ ...EMPTY, search: "?project=a", project: "a", open: { a: ["e-1"], b: ["x-1", "x-2"] } });
  });

  it("REQ-UI-073 a fresh module reads what the tab stored", async () => {
    remembered("?project=a&view=focus");
    vi.resetModules();
    const fresh = await import("@/app/origin");
    expect(fresh.getOrigin().search).toBe("?project=a&view=focus");
  });

  it("REQ-UI-073 keeps the value for the visit when storage refuses to write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    remembered("?project=a&view=board");
    expect(getOrigin().search).toBe("?project=a&view=board");
  });

  it("REQ-UI-073 reads as empty when storage refuses to read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(getOrigin()).toEqual(EMPTY);
  });

  it("REQ-UI-073 stored data without a path reads as /beads", () => {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: "?project=a", open: {} }));
    expect(getOrigin()).toEqual({ ...EMPTY, search: "?project=a", project: "a" });
  });

  it("REQ-UI-073 an old value without a kind reads as a Beads place of the project in its query", () => {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path: "/beads", search: "?project=b&view=board", open: { b: ["x-1"] } }));
    expect(getOrigin()).toEqual({ kind: "beads", path: "/beads", search: "?project=b&view=board", project: "b", label: null, milestone: null, open: { b: ["x-1"] } });
  });

  it("REQ-UI-073 a stored value with a kind keeps its project and label", () => {
    window.sessionStorage.setItem(
      RETURN_KEY,
      JSON.stringify({ kind: "milestone", path: "/milestones/a/m2", search: "?tab=beads", project: "a", label: "Checkout v2", open: {} }),
    );
    expect(getOrigin()).toEqual({ kind: "milestone", path: "/milestones/a/m2", search: "?tab=beads", project: "a", label: "Checkout v2", milestone: null, open: {} });
  });

  it("REQ-UI-073 the pages replace each other as the place", () => {
    rememberOrigin("milestone", "/milestones/a/m2", "?tab=beads&view=board", "a", "Checkout v2");
    expect(getOrigin()).toMatchObject({ kind: "milestone", path: "/milestones/a/m2", project: "a", label: "Checkout v2" });
    remembered("?project=a&view=list");
    expect(getOrigin()).toMatchObject({ kind: "beads", path: "/beads", search: "?project=a&view=list", label: null });
    rememberOrigin("my-tasks", "/my-tasks", "?project=a", "a");
    expect(getOrigin()).toMatchObject({ kind: "my-tasks", path: "/my-tasks", search: "?project=a", project: "a" });
  });

  it("REQ-UI-073 clearOrigin forgets the place and the branches", () => {
    remembered("?project=a");
    rememberOpen("a", ["e-1"]);
    clearOrigin();
    expect(getOrigin()).toEqual(EMPTY);
    expect(window.sessionStorage.getItem(RETURN_KEY)).toBeNull();
  });

  it("REQ-UI-073 ignores damaged text in storage", () => {
    window.sessionStorage.setItem(RETURN_KEY, "{not json");
    expect(getOrigin()).toEqual(EMPTY);
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: 3, open: {} }));
    expect(getOrigin()).toEqual(EMPTY);
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: "", open: { a: [1] } }));
    expect(getOrigin()).toEqual(EMPTY);
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: "", open: [["a"]] }));
    expect(getOrigin()).toEqual(EMPTY);
  });

  it("REQ-UI-073 a stored path that is not a path of this app reads as empty", () => {
    for (const path of ["https://evil.example/x", "//evil.example/x", "beads", "javascript:alert(1)"]) {
      window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ kind: "my-tasks", path, search: "", project: null, open: {} }));
      expect(getOrigin()).toEqual(EMPTY);
    }
  });

  it("REQ-UI-073 a place stored with the retired projects kind reads as a Beads place", () => {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ kind: "projects", path: "/", search: "", project: null, open: {} }));
    expect(getOrigin().kind).toBe("beads");
  });

  describe("originFor", () => {
    const at = (kind: Origin["kind"], project: string | null): Origin => ({ ...EMPTY, kind, project });

    it("REQ-UI-073 a place of the bead's project is used", () => {
      for (const kind of ["beads", "milestone", "my-tasks", "reports"] as const) expect(originFor("a", at(kind, "a"))).not.toBeNull();
    });

    it("REQ-UI-073 a place of another project is not used", () => {
      for (const kind of ["beads", "milestone", "my-tasks", "reports"] as const) expect(originFor("b", at(kind, "a"))).toBeNull();
    });

    it("REQ-UI-073 nothing remembered, or a place stored with no project, is not used", () => {
      expect(originFor("a", EMPTY)).toBeNull();
      for (const kind of ["beads", "milestone", "my-tasks", "reports"] as const) expect(originFor("a", at(kind, null))).toBeNull();
    });
  });

  it("REQ-UI-072 a Beads place keeps the milestone its page had in effect; another place has none", () => {
    rememberOrigin("beads", "/beads", "?project=a&milestone=all", "a", null, { inEffect: "all", byDefault: "m2" });
    expect(getOrigin().milestone).toEqual({ inEffect: "all", byDefault: "m2" });
    rememberOrigin("my-tasks", "/my-tasks", "?project=a", "a");
    expect(getOrigin().milestone).toBeNull();
  });

  it("REQ-UI-072 a damaged stored milestone reads as none", () => {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ kind: "beads", path: "/beads", search: "?project=a", project: "a", label: null, milestone: { inEffect: 3 }, open: {} }));
    expect(getOrigin().milestone).toBeNull();
  });
});
