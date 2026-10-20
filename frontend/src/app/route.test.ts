import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigate } from "./route";

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
