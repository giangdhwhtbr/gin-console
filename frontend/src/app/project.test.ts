import { renderHook, waitFor, act } from "@testing-library/react";
import type { ProjectBeads } from "@/features/projects/api";
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

describe("refused reads", () => {
  it("REQ-UI-124 resolves without error when storage refuses reads", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const p = await load();
    expect(p.resolveProject("", ["a", "b"])).toBe("a");
  });
});

vi.mock("@/features/projects/api", () => ({ fetchProjectBeads: vi.fn() }));

describe("useConfiguredProjects", () => {
  const row = (name: string, exists: boolean): ProjectBeads => ({ name, path: `/${name}`, exists, beads: null, pull: null });

  async function setup() {
    const p = await load();
    const api = await import("@/features/projects/api");
    const fetchMock = vi.mocked(api.fetchProjectBeads);
    fetchMock.mockReset();
    return { p, fetchMock };
  }

  it("REQ-UI-124 lists only projects whose directory exists, fetched once across mounts", async () => {
    const { p, fetchMock } = await setup();
    fetchMock.mockResolvedValue([row("a", true), row("gone", false), row("b", true)]);
    const first = renderHook(() => p.useConfiguredProjects());
    await waitFor(() => expect(first.result.current).toEqual({ status: "ok", names: ["a", "b"] }));
    const second = renderHook(() => p.useConfiguredProjects());
    await waitFor(() => expect(second.result.current.status).toBe("ok"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("REQ-UI-124 reports an error and asks again on a remount", async () => {
    const { p, fetchMock } = await setup();
    fetchMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce([row("a", true)]);
    const first = renderHook(() => p.useConfiguredProjects());
    await waitFor(() => expect(first.result.current).toEqual({ status: "error", message: "boom" }));
    first.unmount();
    const second = renderHook(() => p.useConfiguredProjects());
    await waitFor(() => expect(second.result.current).toEqual({ status: "ok", names: ["a"] }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("REQ-UI-124 refetches in a mounted hook after forgetConfiguredProjects", async () => {
    const { p, fetchMock } = await setup();
    fetchMock.mockResolvedValueOnce([row("a", true)]).mockResolvedValueOnce([row("a", true), row("b", true)]);
    const view = renderHook(() => p.useConfiguredProjects());
    await waitFor(() => expect(view.result.current).toEqual({ status: "ok", names: ["a"] }));
    act(() => p.forgetConfiguredProjects());
    await waitFor(() => expect(view.result.current).toEqual({ status: "ok", names: ["a", "b"] }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it("REQ-UI-123 keeps closed and drops milestone on the My Tasks page", async () => {
    const p = await load();
    expect(p.switchProject("/my-tasks", "?project=a&closed=1&milestone=m1", "b")).toBe("/my-tasks?project=b&closed=1");
  });

  it("REQ-UI-123 leaves other addresses unchanged", async () => {
    const p = await load();
    expect(p.switchProject("/", "", "b")).toBe("/");
  });
});

describe("projectHref", () => {
  it("REQ-UI-124 carries the project, or nothing when there is none", async () => {
    const p = await load();
    expect(p.projectHref("/beads", "")).toBe("/beads");
    expect(p.projectHref("/reports", "my app")).toBe("/reports?project=my+app");
    expect(p.projectHref("/my-tasks", "alpha")).toBe("/my-tasks?project=alpha");
    expect(p.projectHref("/my-tasks", "")).toBe("/my-tasks");
  });
});
