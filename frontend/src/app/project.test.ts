import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return import("./project");
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("resolveProject", () => {
  const names = ["a", "b", "c"];

  it("REQ-UI-124 takes the project of the URL when it is configured", async () => {
    const p = await load();
    p.rememberProject("b");
    p.setFavorite("c");
    expect(p.resolveProject("a", names)).toBe("a");
  });

  it("REQ-UI-124 prefers the tab's choice to the favorite", async () => {
    const p = await load();
    p.setFavorite("a");
    p.rememberProject("b");
    expect(p.resolveProject("", names)).toBe("b");
  });

  it("REQ-UI-124 uses the favorite in a new tab", async () => {
    const p = await load();
    p.setFavorite("c");
    window.sessionStorage.clear();
    const fresh = await load();
    expect(fresh.resolveProject("", names)).toBe("c");
  });

  it("REQ-UI-124 falls back to the first project", async () => {
    const p = await load();
    expect(p.resolveProject("", names)).toBe("a");
    expect(p.resolveProject("zzz", names)).toBe("a");
  });

  it("REQ-UI-124 skips a removed favorite and a removed tab choice", async () => {
    const p = await load();
    p.setFavorite("old");
    expect(p.resolveProject("", names)).toBe("a");
    p.rememberProject("gone");
    expect(p.resolveProject("", names)).toBe("a");
  });

  it("REQ-UI-124 gives an empty name when no project is configured", async () => {
    const p = await load();
    expect(p.resolveProject("a", [])).toBe("");
  });

  it("REQ-UI-124 forgets the favorite when it is cleared", async () => {
    const p = await load();
    p.setFavorite("c");
    p.setFavorite(null);
    expect(p.resolveProject("", names)).toBe("a");
  });
});

describe("isUnknownProject", () => {
  it("REQ-UI-124 flags a name that is not configured, not empty and not all", async () => {
    const p = await load();
    expect(p.isUnknownProject("zzz", ["a"])).toBe(true);
    expect(p.isUnknownProject("", ["a"])).toBe(false);
    expect(p.isUnknownProject("all", ["a"])).toBe(false);
    expect(p.isUnknownProject("a", ["a"])).toBe(false);
  });
});

describe("refused storage", () => {
  it("REQ-UI-124 keeps the choices for the visit when storage refuses writes", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const p = await load();
    expect(() => p.setFavorite("c")).not.toThrow();
    expect(p.resolveProject("", ["a", "b", "c"])).toBe("c");
    expect(() => p.rememberProject("b")).not.toThrow();
    expect(p.resolveProject("", ["a", "b", "c"])).toBe("b");
  });
});

describe("switchProject", () => {
  it("REQ-UI-123 keeps view, closed, tab, days and q on the Beads page", async () => {
    const p = await load();
    expect(p.switchProject("/beads", "?project=a&view=board&milestone=m1&status=open&q=x", "b")).toBe(
      "/beads?project=b&view=board&q=x",
    );
  });

  it("REQ-UI-123 drops member on the Reports page", async () => {
    const p = await load();
    expect(p.switchProject("/reports", "?project=a&tab=quality&days=7&member=ann", "b")).toBe(
      "/reports?project=b&tab=quality&days=7",
    );
  });

  it("REQ-UI-123 opens the Beads page from a bead page", async () => {
    const p = await load();
    expect(p.switchProject("/beads/a/a-1", "", "b")).toBe("/beads?project=b");
    expect(p.switchProject("/beads/a/graph", "?x=1", "b")).toBe("/beads?project=b");
  });

  it("REQ-UI-123 opens the Milestones page from a milestone page", async () => {
    const p = await load();
    expect(p.switchProject("/milestones/a/m1", "?tab=beads", "b")).toBe("/milestones?project=b");
  });

  it("REQ-UI-123 leaves My Tasks, Projects and others unchanged", async () => {
    const p = await load();
    expect(p.switchProject("/my-tasks", "?project=a", "b")).toBe("/my-tasks?project=a");
    expect(p.switchProject("/", "", "b")).toBe("/");
  });
});

describe("projectHref", () => {
  it("REQ-UI-124 carries the project, or nothing when there is none", async () => {
    const p = await load();
    expect(p.projectHref("/beads", "")).toBe("/beads");
    expect(p.projectHref("/reports", "my app")).toBe("/reports?project=my+app");
  });
});
