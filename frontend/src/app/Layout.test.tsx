import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_KEY, getEmail, resetIdentity, setEmail } from "./identity";
import { Layout, SIDEBAR_KEY } from "./Layout";
import { forgetConfiguredProjects, setFavorite } from "./project";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const row = (name: string) => ({ name, path: `/${name}`, exists: true, beads: null, pull: null });
const fetched = vi.fn((url: string) =>
  Promise.resolve(url === "/api/projects/beads" ? json([row("alpha"), row("beta")]) : json({})),
);

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setFavorite(null);
  fetched.mockClear();
  vi.stubGlobal("fetch", fetched);
  forgetConfiguredProjects();
});
afterEach(() => {
  cleanup();
  resetIdentity();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const open = (path: string) => {
  window.history.replaceState(null, "", path);
  render(<Layout onRefreshed={() => {}}>page</Layout>);
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
    "REQ-UI-055 REQ-UI-099 has one Main navigation with the five links on %s",
    async (path) => {
      open(path);
      await screen.findByRole("button", { name: "Project: alpha" });
      expect(screen.getAllByRole("navigation")).toHaveLength(1);
      expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
      expect(within(nav()).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
        ["Projects", "/"],
        ["Beads", "/beads?project=alpha"],
        ["My Tasks", "/my-tasks"],
        ["Milestones", "/milestones?project=alpha"],
        ["Reports", "/reports?project=alpha"],
      ]);
    },
  );

  it("REQ-UI-124 REQ-UI-055 the links carry the project of the URL", async () => {
    open("/beads?project=beta");
    await screen.findByRole("button", { name: "Project: beta" });
    const hrefs = within(nav()).getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/beads?project=beta", "/my-tasks", "/milestones?project=beta", "/reports?project=beta"]);
  });

  it("REQ-UI-124 the links follow the favorite when the URL names no project", async () => {
    setFavorite("beta");
    open("/");
    await screen.findByRole("button", { name: "Project: beta" });
    expect(within(nav()).getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=beta");
  });

  it("REQ-UI-123 puts the switcher in the top bar, and the sidebar variant above the navigation", async () => {
    open("/");
    await screen.findByRole("button", { name: "Project: alpha" });
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("button", { name: "alpha" })).toBeInTheDocument();
    const sidebar = screen.getByRole("button", { name: /alpha\s*2 projects/ });
    expect(sidebar.compareDocumentPosition(nav()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("REQ-UI-123 REQ-UI-094 the collapsed sidebar keeps only the rail switcher", async () => {
    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
    open("/");
    await screen.findByRole("button", { name: "Project: alpha" });
    expect(screen.queryByRole("button", { name: /alpha\s*2 projects/ })).toBeNull();
  });

  it("REQ-UI-124 Refresh asks for the configured projects again", async () => {
    open("/");
    await screen.findByRole("button", { name: "Project: alpha" });
    const asked = () => fetched.mock.calls.filter(([url]) => url === "/api/projects/beads").length;
    expect(asked()).toBe(1);
    await userEvent.click(screen.getAllByRole("button", { name: "Refresh data" })[0]);
    await waitFor(() => expect(asked()).toBe(2));
  });

  it.each([
    ["/", ["Projects"]],
    ["/beads", ["Beads"]],
    ["/beads/alpha/a-1", ["Beads"]],
    ["/my-tasks", ["My Tasks"]],
    ["/milestones", ["Milestones"]],
    ["/milestones/alpha/m-1", ["Milestones"]],
    ["/milestonesx", []],
    ["/sessions", []],
    ["/sessionsx", []],
    ["/sessions/alpha/11111111-1111-4111-8111-111111111111", []],
    ["/reports", ["Reports"]],
    ["/reportsx", []],
    ["/quota", []],
    ["/nowhere", []],
    ["/beadsx", []],
  ])("REQ-UI-057 %s marks %j", (path, expected) => {
    open(path);
    expect(marked()).toEqual(expected);
  });

  it("REQ-UI-057 follows a click", async () => {
    open("/");
    await userEvent.click(within(nav()).getByRole("link", { name: "Reports" }));
    expect(marked()).toEqual(["Reports"]);
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

  it("REQ-UI-096 offers Refresh in the top bar and in the sidebar, above the navigation", () => {
    open("/");
    const buttons = screen.getAllByRole("button", { name: "Refresh data" });
    expect(buttons).toHaveLength(2);
    expect(buttons[1].compareDocumentPosition(nav()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

  describe("signed in", () => {
    beforeEach(() => setEmail("tester@example.com"));
    afterEach(() => window.localStorage.removeItem(EMAIL_KEY));

    it("REQ-UI-098 the sidebar shows the email and Log out", () => {
      open("/");
      expect(screen.getAllByText("tester@example.com").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /^Log out/ }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: "Log out tester@example.com" }).length).toBeGreaterThan(0);
    });

    it("REQ-UI-098 Log out forgets the email", async () => {
      open("/");
      await userEvent.click(screen.getAllByRole("button", { name: /^Log out/ })[0]);
      expect(getEmail()).toBeNull();
    });
  });

  it("REQ-UI-128 Tab reaches Skip to content first and Enter moves focus to main", async () => {
    open("/beads");
    await userEvent.tab();
    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#main");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("main")).toHaveFocus();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });
});
