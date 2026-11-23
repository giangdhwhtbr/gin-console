import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChoose } from "./useChoose";

const narrow = () => vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

beforeEach(() => window.history.replaceState(null, "", "/beads?project=p"));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useChoose", () => {
  it("REQ-UI-147 Select a card: from 1024px a click selects", () => {
    const select = vi.fn();
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select }));
    act(() => result.current.click("t-1"));
    expect(select).toHaveBeenCalledWith("t-1");
    expect(window.location.pathname).toBe("/beads");
  });

  it("REQ-UI-147 Click the selected item: it stays selected and nothing is written", () => {
    const select = vi.fn();
    const { result } = renderHook(() => useChoose({ project: "p", selected: "t-1", select }));
    act(() => result.current.click("t-1"));
    expect(select).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/beads");
  });

  it("REQ-UI-147 Phone: below 1024px a click opens the bead page", () => {
    narrow();
    const select = vi.fn();
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select }));
    act(() => result.current.click("t 1"));
    expect(select).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/beads/p/t%201");
  });

  it("REQ-UI-147 Double click: open goes to the bead page with a history entry", () => {
    const before = window.history.length;
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select: vi.fn() }));
    act(() => result.current.open("e1"));
    expect(window.location.pathname).toBe("/beads/p/e1");
    expect(window.history.length).toBe(before + 1);
  });

  it("REQ-UI-147 Double click after the panel moved the item: the item of the first click opens", () => {
    const select = vi.fn();
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select }));
    act(() => result.current.click("t-1"));
    expect(select).toHaveBeenCalledWith("t-1");
    // the second click lands on another element, here the body
    act(() => void document.body.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(window.location.pathname).toBe("/beads/p/t-1");
  });

  it("REQ-UI-147 Double click: a late or lone dblclick opens nothing", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select: vi.fn() }));
    act(() => void document.body.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(window.location.pathname).toBe("/beads");
    act(() => result.current.click("t-1"));
    now.mockReturnValue(1_600);
    act(() => void document.body.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(window.location.pathname).toBe("/beads");
    now.mockRestore();
  });

  it("REQ-UI-147 Enter twice: the first selects, the second opens", () => {
    const select = vi.fn();
    const { result, rerender } = renderHook(({ selected }) => useChoose({ project: "p", selected, select }), { initialProps: { selected: "" } });
    act(() => result.current.enter("t-2"));
    expect(select).toHaveBeenCalledWith("t-2");
    rerender({ selected: "t-2" });
    act(() => result.current.enter("t-2"));
    expect(window.location.pathname).toBe("/beads/p/t-2");
  });

  it("REQ-UI-147 Enter on a phone opens at once", () => {
    narrow();
    const select = vi.fn();
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select }));
    act(() => result.current.enter("t-1"));
    expect(select).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/beads/p/t-1");
  });
});
