import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearReturn, getReturn, RETURN_KEY, rememberOpen, rememberSearch } from "./returnState";

beforeEach(() => {
  window.sessionStorage.clear();
  clearReturn();
});
afterEach(() => vi.restoreAllMocks());

describe("returnState", () => {
  it("REQ-UI-073 remembers the search", () => {
    rememberSearch("?project=a&view=board&status=open");
    expect(getReturn().search).toBe("?project=a&view=board&status=open");
  });

  it("REQ-UI-074 remembers the open branches per project and keeps the search", () => {
    rememberSearch("?project=a");
    rememberOpen("a", ["e-1"]);
    rememberOpen("b", ["x-1", "x-2"]);
    expect(getReturn()).toEqual({ search: "?project=a", open: { a: ["e-1"], b: ["x-1", "x-2"] } });
  });

  it("REQ-UI-073 a fresh module reads what the tab stored", async () => {
    rememberSearch("?project=a&view=focus");
    vi.resetModules();
    const fresh = await import("./returnState");
    expect(fresh.getReturn().search).toBe("?project=a&view=focus");
  });

  it("REQ-UI-073 keeps the value for the visit when storage refuses to write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    rememberSearch("?project=a&view=board");
    expect(getReturn().search).toBe("?project=a&view=board");
  });

  it("REQ-UI-073 clearReturn forgets the place and the branches", () => {
    rememberSearch("?project=a");
    rememberOpen("a", ["e-1"]);
    clearReturn();
    expect(getReturn()).toEqual({ search: "", open: {} });
    expect(window.sessionStorage.getItem(RETURN_KEY)).toBeNull();
  });

  it("REQ-UI-073 ignores damaged text in storage", () => {
    window.sessionStorage.setItem(RETURN_KEY, "{not json");
    expect(getReturn()).toEqual({ search: "", open: {} });
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: 3, open: {} }));
    expect(getReturn()).toEqual({ search: "", open: {} });
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: "", open: { a: [1] } }));
    expect(getReturn()).toEqual({ search: "", open: {} });
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: "", open: [["a"]] }));
    expect(getReturn()).toEqual({ search: "", open: {} });
  });
});
