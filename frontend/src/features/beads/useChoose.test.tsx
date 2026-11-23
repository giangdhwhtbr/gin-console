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
    // the second click lands on another element, here the body, then the browser fires dblclick
    act(() => void document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 2 })));
    act(() => void document.body.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(window.location.pathname).toBe("/beads/p/t-1");
  });

  it("REQ-UI-147 Double click: the second click never acts on the element it lands on", () => {
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select: vi.fn() }));
    const other = document.body.appendChild(document.createElement("button"));
    const link = document.body.appendChild(document.createElement("a"));
    link.href = "/beads/p/t-2";
    const onOther = vi.fn();
    const onLink = vi.fn();
    other.addEventListener("click", onOther);
    link.addEventListener("click", onLink);
    act(() => result.current.click("t-1"));
    const second = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 2 });
    act(() => void other.dispatchEvent(second));
    expect(onOther).not.toHaveBeenCalled();
    expect(second.defaultPrevented).toBe(true);
    const onLinkSecond = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 2 });
    act(() => void link.dispatchEvent(onLinkSecond));
    expect(onLink).not.toHaveBeenCalled();
    expect(onLinkSecond.defaultPrevented).toBe(true);
    act(() => void document.body.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(window.location.pathname).toBe("/beads/p/t-1");
    // a single click (detail 1) and a keyboard click (detail 0) still reach the element
    act(() => void other.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
    act(() => void other.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })));
    expect(onOther).toHaveBeenCalledTimes(2);
    other.remove();
    link.remove();
  });

  it("REQ-UI-147 Double click: a single or keyboard click right after a click still reaches its element", () => {
    const { result } = renderHook(() => useChoose({ project: "p", selected: "", select: vi.fn() }));
    const other = document.body.appendChild(document.createElement("button"));
    const onOther = vi.fn();
    other.addEventListener("click", onOther);
    act(() => result.current.click("t-1"));
    // before any dblclick: detail 1 and detail 0 are not the second click of a double click
    const single = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    const keyboard = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 });
    act(() => void other.dispatchEvent(single));
    act(() => void other.dispatchEvent(keyboard));
    expect(onOther).toHaveBeenCalledTimes(2);
    expect(single.defaultPrevented).toBe(false);
    expect(keyboard.defaultPrevented).toBe(false);
    other.remove();
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
