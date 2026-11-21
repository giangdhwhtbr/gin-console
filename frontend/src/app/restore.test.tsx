import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigate, useRestoreOnBack } from "./route";

const Page = ({ ready }: { ready: boolean }) => {
  useRestoreOnBack(ready);
  return (
    <ul>
      <li data-id="a-6" tabIndex={-1}>
        a-6
      </li>
      <li data-id="a-7" tabIndex={-1}>
        a-7
      </li>
    </ul>
  );
};

const scrollTo = vi.fn();
const settle = () => act(() => void vi.advanceTimersByTime(50));

/** Leave "/beads" scrolled 1,200px down by opening a-7, then stand on the "/beads" entry again. */
function leaveAndGoBack(y: number): void {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  navigate("/beads");
  const list: unknown = window.history.state;
  navigate("/beads/p/a-7");
  window.history.replaceState(list, "", "/beads");
}
const browserPop = () => act(() => void window.dispatchEvent(new PopStateEvent("popstate")));

describe("useRestoreOnBack", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    window.scrollTo = scrollTo;
    scrollTo.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("REQ-UI-127 Back to a long list scrolls to where it was, once the page is ready", () => {
    leaveAndGoBack(1200);
    scrollTo.mockClear();
    const view = render(<Page ready={false} />);
    browserPop();
    settle();
    expect(scrollTo).not.toHaveBeenCalled();
    view.rerender(<Page ready />);
    settle();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 1200);
  });

  it("REQ-UI-127 Back focuses the last opened bead and marks it for 2 seconds", () => {
    leaveAndGoBack(300);
    const view = render(<Page ready />);
    browserPop();
    settle();
    const row = view.container.querySelector<HTMLElement>('[data-id="a-7"]');
    expect(row).toHaveFocus();
    expect(row).toHaveAttribute("data-last-opened");
    act(() => void vi.advanceTimersByTime(2000));
    expect(row).not.toHaveAttribute("data-last-opened");
  });

  it("REQ-UI-127 restores once per arrival", () => {
    leaveAndGoBack(300);
    scrollTo.mockClear();
    const view = render(<Page ready />);
    browserPop();
    settle();
    view.rerender(<Page ready={false} />);
    view.rerender(<Page ready />);
    settle();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("REQ-UI-127 Forward restores the entry it lands on", () => {
    navigate("/beads");
    const list: unknown = window.history.state;
    Object.defineProperty(window, "scrollY", { value: 700, configurable: true });
    navigate("/reports"); // saves "/beads" at 700
    window.history.replaceState(list, "", "/beads");
    render(<Page ready />);
    browserPop(); // Back to /beads
    settle();
    expect(scrollTo).toHaveBeenCalledWith(0, 700);
  });

  it("REQ-UI-127 a link to the page starts at the top", () => {
    leaveAndGoBack(1200);
    scrollTo.mockClear();
    render(<Page ready />);
    act(() => navigate("/beads")); // the synthetic popstate of a link
    settle();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.querySelector("[data-last-opened]")).toBeNull();
  });

  it("REQ-UI-127 storage refused: the page starts at the top without an error", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    leaveAndGoBack(1200);
    scrollTo.mockClear();
    render(<Page ready />);
    expect(() => browserPop()).not.toThrow();
    settle();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
