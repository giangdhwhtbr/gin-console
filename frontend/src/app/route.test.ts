import { cleanup, render, screen } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigate, useLocation } from "./route";

const places = (): Record<string, { y: number; opened: string | null }> =>
  JSON.parse(window.sessionStorage.getItem("gin-console-scroll") ?? "{}") as Record<string, { y: number; opened: string | null }>;
const keyNow = (): unknown => (window.history.state as { key?: unknown } | null)?.key;


describe("navigate", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // REQ-UI-022
  it("REQ-UI-022 navigate(to) pushes a history entry and fires popstate", () => {
    const onPopState = vi.fn();
    window.addEventListener("popstate", onPopState);
    const initialLength = window.history.length;

    navigate("/x");

    expect(window.history.length).toBeGreaterThan(initialLength);
    expect(window.location.pathname).toBe("/x");
    expect(onPopState).toHaveBeenCalledTimes(1);

    window.removeEventListener("popstate", onPopState);
  });

  // REQ-UI-022
  it("REQ-UI-022 navigate(to, { replace: true }) replaces history and fires popstate", () => {
    navigate("/x");
    const onPopState = vi.fn();
    window.addEventListener("popstate", onPopState);
    const initialLength = window.history.length;

    navigate("/y", { replace: true });

    expect(window.history.length).toBe(initialLength);
    expect(window.location.pathname).toBe("/y");
    expect(onPopState).toHaveBeenCalledTimes(1);

    window.removeEventListener("popstate", onPopState);
  });
});

describe("useLocation", () => {
  afterEach(cleanup);

  it("REQ-UI-075 sees a navigation a child made in its mount effect, before the parent's listener existed", () => {
    window.history.replaceState(null, "", "/old");
    const Child = () => {
      useEffect(() => navigate("/new?x=1", { replace: true }), []);
      return null;
    };
    const Parent = () => {
      const { pathname, search } = useLocation();
      return createElement("div", null, `at ${pathname}${search}`, createElement(Child));
    };
    render(createElement(Parent));
    expect(screen.getByText("at /new?x=1")).toBeInTheDocument();
  });
});

describe("saved places", () => {
  let scrolled = vi.fn();
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    scrolled = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("REQ-UI-127 gives the current entry a key and a pushed entry another", () => {
    navigate("/a");
    const first = keyNow();
    expect(typeof first).toBe("string");
    navigate("/b");
    expect(typeof keyNow()).toBe("string");
    expect(keyNow()).not.toBe(first);
  });

  it("REQ-UI-127 a replace keeps the key and saves nothing", () => {
    navigate("/a");
    const before = keyNow();
    navigate("/a?x=1", { replace: true });
    expect(keyNow()).toBe(before);
    expect(places()).not.toHaveProperty(String(before));
  });

  it("REQ-UI-127 a push saves the scroll position and the bead it opens", () => {
    Object.defineProperty(window, "scrollY", { value: 1200, configurable: true });
    navigate("/beads");
    const list = keyNow();
    navigate("/beads/p%201/a%2D7");
    expect(places()[String(list)]).toEqual({ y: 1200, opened: "a-7" });
    expect(scrolled).toHaveBeenLastCalledWith(0, 0);
  });

  it("REQ-UI-127 a push to another page saves no opened bead", () => {
    navigate("/beads");
    const list = keyNow();
    navigate("/reports");
    expect(places()[String(list)]).toEqual({ y: 0, opened: null });
  });

  it("REQ-UI-127 keeps the newest 50 positions", () => {
    for (let i = 0; i < 60; i++) navigate(`/p${i}`);
    const saved = Object.keys(places());
    expect(saved).toHaveLength(50);
  });

  it("REQ-UI-127 a browser that refuses storage does not stop navigation", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => navigate("/a")).not.toThrow();
    expect(window.location.pathname).toBe("/a");
  });
});
