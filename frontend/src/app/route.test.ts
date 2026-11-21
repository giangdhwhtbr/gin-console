import { cleanup, render, screen } from "@testing-library/react";
import { createElement, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigate, useLocation } from "./route";

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
