import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Layout, SIDEBAR_KEY } from "./Layout";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const open = (path: string) => {
  window.history.replaceState(null, "", path);
  render(<Layout>page</Layout>);
};
const nav = () => screen.getByRole("navigation", { name: "Main" });
const sidebarToggle = () => screen.getByRole("button", { name: /(Collapse|Expand) sidebar/ });
const marked = () =>
  within(nav())
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent);

describe("Layout", () => {
  it.each(["/", "/beads", "/sessions", "/reports"])(
    "REQ-UI-055 has one Main navigation with the five links on %s",
    (path) => {
      open(path);
      expect(screen.getAllByRole("navigation")).toHaveLength(1);
      expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
      expect(within(nav()).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
        ["Projects", "/"],
        ["Beads", "/beads"],
        ["Milestones", "/milestones"],
        ["Reports", "/reports"],
        ["Quota", "/quota"],
      ]);
    },
  );

  it.each([
    ["/", ["Projects"]],
    ["/beads", ["Beads"]],
    ["/beads/alpha/a-1", ["Beads"]],
    ["/milestones", ["Milestones"]],
    ["/milestones/alpha/m-1", ["Milestones"]],
    ["/milestonesx", []],
    ["/sessions", []],
    ["/sessionsx", []],
    ["/sessions/alpha/11111111-1111-4111-8111-111111111111", []],
    ["/reports", ["Reports"]],
    ["/reportsx", []],
    ["/quota", ["Quota"]],
    ["/nowhere", []],
    ["/beadsx", []],
  ])("REQ-UI-057 %s marks %j", (path, expected) => {
    open(path);
    expect(marked()).toEqual(expected);
  });

  it("REQ-UI-057 follows a click", async () => {
    open("/");
    await userEvent.click(within(nav()).getByRole("link", { name: "Quota" }));
    expect(marked()).toEqual(["Quota"]);
  });

  it("REQ-UI-062 offers the theme control", () => {
    open("/");
    expect(screen.getAllByRole("button", { name: /Switch to (dark|light) theme/ }).length).toBeGreaterThan(0);
  });

  it("REQ-UI-094 starts expanded when nothing is stored", () => {
    open("/");
    expect(sidebarToggle()).toHaveAccessibleName("Collapse sidebar");
    expect(sidebarToggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("REQ-UI-094 collapses, stores the choice, and expands again", async () => {
    open("/");
    await userEvent.click(sidebarToggle());
    expect(sidebarToggle()).toHaveAccessibleName("Expand sidebar");
    expect(sidebarToggle()).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");
    await userEvent.click(sidebarToggle());
    expect(sidebarToggle()).toHaveAccessibleName("Collapse sidebar");
    expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("expanded");
  });

  it("REQ-UI-094 starts collapsed when the choice is stored", () => {
    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
    open("/");
    expect(sidebarToggle()).toHaveAccessibleName("Expand sidebar");
  });

  it("REQ-UI-094 toggles for this visit when storage is refused", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    open("/");
    expect(sidebarToggle()).toHaveAccessibleName("Collapse sidebar");
    await userEvent.click(sidebarToggle());
    expect(sidebarToggle()).toHaveAccessibleName("Expand sidebar");
  });

  it("REQ-UI-094 puts the theme and collapse controls above the navigation", () => {
    open("/");
    const [, sidebarTheme] = screen.getAllByRole("button", { name: /Switch to (dark|light) theme/ });
    for (const control of [sidebarTheme, sidebarToggle()]) {
      expect(control.compareDocumentPosition(nav()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("REQ-UI-055 REQ-UI-056 REQ-UI-057 keeps one Main navigation with the five links when collapsed", () => {
    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
    open("/beads");
    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
    expect(within(nav()).getAllByRole("link")).toHaveLength(5);
    expect(marked()).toEqual(["Beads"]);
  });
});
