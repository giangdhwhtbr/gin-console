import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_KEY, getEmail, resetIdentity, setEmail } from "./identity";
import { Layout, SIDEBAR_KEY } from "./Layout";
import { clearOrigin, rememberOrigin, RETURN_KEY } from "./origin";
import { clearSections, publishSections, type SectionLink } from "@/features/reports/sectionStore";
import { clearSections as clearRequirementSections, publishSections as publishRequirementSections, type SectionLink as RequirementSectionLink } from "@/features/requirements/sectionStore";
import { forgetConfiguredProjects, setFavorite } from "./project";
import { getSession, loadSession } from "./session";

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
  clearOrigin();
});
afterEach(() => {
  cleanup();
  clearSections();
  clearRequirementSections();
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

/** The text of the Requirements link: its short label, then its wide one (CSS shows one of them). */
const REQUIREMENTS = "REQs (Requirements)Requirements";

describe("Layout", () => {
  it.each(["/", "/beads", "/sessions", "/requirements/matrix", "/reports"])(
    "REQ-UI-055 REQ-UI-099 has one Main navigation with the six links, Overview first, on %s",
    async (path) => {
      open(path);
      await screen.findByRole("button", { name: "Project: alpha" });
      expect(screen.getAllByRole("navigation")).toHaveLength(1);
      expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
      expect(within(nav()).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
        ["Overview", "/"],
        ["Beads", "/beads?project=alpha"],
        ["My work", "/my-tasks?project=alpha"],
        ["Milestones", "/milestones?project=alpha"],
        ["REQs (Requirements)Requirements", "/requirements?project=alpha"], // the short and the wide label; CSS shows one
        ["Reports", "/reports/status?project=alpha"],
      ]);
    },
  );

  it("REQ-UI-124 REQ-UI-055 the links carry the project of the URL", async () => {
    open("/beads?project=beta");
    await screen.findByRole("button", { name: "Project: beta" });
    const hrefs = within(nav()).getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/beads?project=beta", "/my-tasks?project=beta", "/milestones?project=beta", "/requirements?project=beta", "/reports/status?project=beta"]);
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

  it("REQ-UI-061 the phone top bar lets the switcher shrink and drops the brand word on a narrow window", async () => {
    open("/");
    const bar = await screen.findByRole("banner");
    expect(within(bar).getByRole("button", { name: "alpha" })).toHaveClass("min-w-0", "shrink");
    expect(within(bar).getByText("gin-console")).toHaveClass("max-sm:sr-only");
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
    ["/", ["Overview"]],
    ["/?project=beta", ["Overview"]],
    ["/beads", ["Beads"]],
    ["/beads/alpha/a-1", ["Beads"]],
    ["/my-tasks", ["My work"]],
    ["/milestones", ["Milestones"]],
    ["/milestones/alpha/m-1", ["Milestones"]],
    ["/milestonesx", []],
    ["/sessions", []],
    ["/sessionsx", []],
    ["/sessions/alpha/11111111-1111-4111-8111-111111111111", []],
    ["/reports", ["Reports"]],
    ["/reports/delivery", ["Reports"]],
    ["/reports/nope", ["Reports"]],
    ["/reportsx", []],
    ["/quota", []],
    ["/requirements", [REQUIREMENTS]],
    ["/requirements/matrix", [REQUIREMENTS]],
    ["/requirements/changes/e1-login", [REQUIREMENTS]],
    ["/requirementsx", []],
    ["/nowhere", []],
    ["/beadsx", []],
  ])("REQ-UI-057 %s marks %j", (path, expected) => {
    open(path);
    expect(marked()).toEqual(expected);
  });

  it.each<[string, Parameters<typeof rememberOrigin> | null, string[]]>([
    ["Bead page by address", null, ["Beads"]],
    ["Overview", ["overview", "/", "", null], ["Overview"]],
    ["Bead page from My work", ["my-tasks", "/my-tasks", "?project=alpha", "alpha"], ["My work"]],
    ["a milestone page", ["milestone", "/milestones/alpha/m-1", "?tab=beads", "alpha"], ["Milestones"]],
    ["Reports", ["reports", "/reports/rework", "?project=alpha&days=7", "alpha"], ["Reports"]],
    ["Bead page from Requirements", ["requirements", "/requirements/matrix", "?project=alpha", "alpha"], [REQUIREMENTS]],
    ["the Beads page", ["beads", "/beads", "?project=alpha", "alpha"], ["Beads"]],
    ["My work of another project", ["my-tasks", "/my-tasks", "?project=beta", "beta"], ["Beads"]],
  ])("REQ-UI-057 a bead page of alpha opened from %s marks %j", (_name, from, expected) => {
    if (from !== null) rememberOrigin(...from);
    open("/beads/alpha/a-1");
    expect(marked()).toEqual(expected);
  });

  it("REQ-UI-057 REQ-UI-073 a bead page whose remembered place is the retired Projects page marks Beads", () => {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ kind: "projects", path: "/", search: "", project: null, open: {} }));
    open("/beads/alpha/a-1");
    expect(marked()).toEqual(["Beads"]);
  });

  it("REQ-UI-057 a retired page marks nothing whatever was remembered", () => {
    rememberOrigin("my-tasks", "/my-tasks", "?project=alpha", "alpha");
    open("/sessions/alpha/11111111-1111-4111-8111-111111111111");
    expect(marked()).toEqual([]);
  });

  it("REQ-UI-057 follows a click", async () => {
    open("/beads");
    await userEvent.click(within(nav()).getByRole("link", { name: "Reports" }));
    expect(marked()).toEqual(["Reports"]);
  });

  it("REQ-UI-057 REQ-UI-072 a bead page of another project opened from the Overview marks Overview", () => {
    rememberOrigin("overview", "/", "", null);
    open("/beads/beta/b-1");
    expect(marked()).toEqual(["Overview"]);
  });

  it("REQ-UI-123 choosing a project on the Overview keeps the address and the links follow it", async () => {
    open("/");
    const before = window.history.length;
    await userEvent.click(await screen.findByRole("button", { name: "alpha" }));
    await userEvent.click(await screen.findByRole("button", { name: "beta" }));
    await waitFor(() => expect(within(nav()).getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=beta"));
    expect(window.location.pathname + window.location.search).toBe("/");
    expect(window.history.length).toBe(before);
    expect(within(nav()).getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/");
  });

  it("REQ-UI-123 choosing a project on /?project=alpha makes the links follow it", async () => {
    open("/?project=alpha");
    await userEvent.click(await screen.findByRole("button", { name: "alpha" }));
    await userEvent.click(await screen.findByRole("button", { name: "beta" }));
    await waitFor(() => expect(within(nav()).getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=beta"));
  });

  it("REQ-UI-062 the six links share the phone bar and each is at least 44px tall", () => {
    open("/");
    const links = within(nav()).getAllByRole("link");
    expect(links).toHaveLength(6);
    for (const link of links) expect(link).toHaveClass("flex-1", "min-h-16"); // 64px tall, a sixth of 360px is 60px wide
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

  it("REQ-UI-055 REQ-UI-056 REQ-UI-057 keeps one Main navigation with the six links when collapsed", () => {
    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
    open("/beads");
    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
    expect(within(nav()).getAllByRole("link")).toHaveLength(6);
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

  describe("signed in with a console account", () => {
    beforeEach(async () => {
      const user = { name: "An", email: "an@example.com", projects: ["alpha"] };
      const stub = vi.fn((url: string) =>
        Promise.resolve(
          url === "/api/auth/me"
            ? json({ enabled: true, user })
            : url === "/api/auth/logout"
              ? new Response(null, { status: 204 })
              : url === "/api/projects/beads"
                ? json([row("alpha")])
                : json({}),
        ),
      );
      vi.stubGlobal("fetch", stub);
      await loadSession();
    });

    it("REQ-AUTH-014 the sidebar shows the user name and Sign out", () => {
      open("/");
      expect(screen.getAllByText("An").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: "Sign out An" }).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /^Log out/ })).toBeNull();
    });

    it("REQ-AUTH-014 Sign out posts to logout and returns to the sign-in screen", async () => {
      open("/");
      await userEvent.click(screen.getAllByRole("button", { name: "Sign out An" })[0]);
      expect(fetch).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
      await waitFor(() => expect(getSession()).toEqual({ status: "signed-out", returnTo: null }));
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

  describe("report sections in the sidebar", () => {
    const SECTIONS = ["status", "team", "delivery", "velocity", "rework", "bugs"] as const;
    const sections: SectionLink[] = SECTIONS.map((section) => ({
      section,
      label: section[0].toUpperCase() + section.slice(1),
      headline: section === "rework" ? "25% rework" : `${section} headline`,
      warn: section === "rework",
      href: `/reports/${section}?project=a&milestone=m2`,
    }));
    const list = () => screen.queryByRole("list", { name: "Report sections" });

    it("REQ-UI-129 Sections in the sidebar: the six sections with headlines under Reports, the selected one marked, when expanded", () => {
      publishSections(sections, "delivery");
      open("/reports/delivery?project=a&milestone=m2");
      expect(document.querySelector('[data-sidebar="expanded"]')).not.toBeNull();
      const links = within(list()!).getAllByRole("link");
      expect(links.map((l) => l.textContent?.split(" ")[0])).toEqual(["Status", "Team", "Delivery", "Velocity", "Rework", "Bugs"]);
      expect(links[2]).toHaveAccessibleName("Delivery delivery headline");
      expect(links[2]).toHaveAttribute("aria-current", "page");
      expect(links.filter((l) => l.getAttribute("aria-current") === "page")).toHaveLength(1);
      expect(links[4]).toHaveAttribute("href", "/reports/rework?project=a&milestone=m2");
      expect(links[5]).toHaveAttribute("href", "/reports/bugs?project=a&milestone=m2");
      expect(list()).toHaveClass("hidden", "lg:flex");
      expect(within(nav()).getByRole("link", { name: "Reports" })).toHaveAttribute("aria-current", "page");
    });

    it("REQ-UI-129 Change section: clicking a section goes to its path without a reload", async () => {
      publishSections(sections.map((s) => ({ ...s, href: `/reports/${s.section}?project=a&days=7` })), "delivery");
      open("/reports/delivery?project=a&days=7");
      await userEvent.click(within(list()!).getByRole("link", { name: /^Rework/ }));
      expect(window.location.pathname + window.location.search).toBe("/reports/rework?project=a&days=7");
    });

    it("REQ-UI-129 lists nothing on other pages", () => {
      publishSections(sections, "delivery");
      open("/beads");
      expect(list()).toBeNull();
    });

    it("REQ-UI-129 Narrow window: lists nothing while the sidebar is collapsed", () => {
      window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
      publishSections(sections, "delivery");
      open("/reports/delivery?project=a&milestone=m2");
      expect(document.querySelector('[data-sidebar="collapsed"]')).not.toBeNull();
      expect(list()).toBeNull();
    });
  });

  describe("requirement sections in the sidebar", () => {
    const sections: RequirementSectionLink[] = [
      { section: "matrix", label: "Matrix", count: 3, href: "/requirements/matrix?project=a" },
      { section: "changes", label: "Changes", count: 0, href: "/requirements/changes?project=a" },
      { section: "mockups", label: "Mockups", count: null, href: "/requirements/mockups?project=a" },
    ];
    const list = () => screen.queryByRole("list", { name: "Requirement sections" });
    const links = () => within(screen.getByRole("list", { name: "Requirement sections" })).getAllByRole("link");

    it("REQ-REQUIREMENTS-012 Wide: lists the sections with their known numbers, the selected one current", async () => {
      publishRequirementSections(sections, "changes");
      open("/requirements/changes?project=a");
      expect(links().map((l) => l.textContent)).toEqual(["Matrix 3", "Changes 0", "Mockups"]);
      expect(links().map((l) => l.getAttribute("aria-current"))).toEqual([null, "page", null]);
      expect(list()).toHaveClass("hidden", "lg:flex");
      await userEvent.click(links()[2]);
      expect(window.location.pathname + window.location.search).toBe("/requirements/mockups?project=a");
    });

    it.each(["/beads", "/reports/status", "/requirementsx"])("REQ-REQUIREMENTS-012 lists nothing on %s", (path) => {
      publishRequirementSections(sections, "changes");
      open(path);
      expect(list()).toBeNull();
    });

    it("REQ-REQUIREMENTS-012 lists nothing while the sidebar is collapsed", () => {
      window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
      publishRequirementSections(sections, "changes");
      open("/requirements/changes?project=a");
      expect(list()).toBeNull();
    });

    it("REQ-REQUIREMENTS-012 REQ-UI-129 the report sections are not listed under Requirements", () => {
      publishSections([{ section: "team", label: "Team", headline: "", warn: false, href: "/reports/team" }], "team");
      open("/requirements/matrix");
      expect(screen.queryByRole("list", { name: "Report sections" })).toBeNull();
    });
  });

  it("REQ-UI-055 Short label: the phone bar and the icon rail show REQs named REQs (Requirements), the wide sidebar Requirements", () => {
    open("/beads");
    const link = () => within(nav()).getAllByRole("link")[4];
    const [short, wide] = Array.from(link().querySelectorAll(":scope > span"));
    expect(short).toHaveClass("lg:hidden");
    expect(short.textContent).toBe("REQs (Requirements)");
    expect(within(link()).getByText("(Requirements)")).toHaveClass("sr-only");
    expect(wide).toHaveClass("hidden", "lg:inline");
    expect(wide.textContent).toBe("Requirements");
    cleanup();
    window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
    open("/beads");
    expect(within(nav()).getByRole("link", { name: "REQs (Requirements)" })).toHaveAttribute("href", "/requirements");
    expect(link().textContent).toBe("REQs (Requirements)");
  });

  it("REQ-UI-141 the current item has an identity bar and icon; the brand is three beads on an identity thread", () => {
    open("/beads?project=a");
    const current = screen.getAllByRole("link").find((l) => l.getAttribute("aria-current") === "page");
    expect(current?.className).toContain("md:aria-[current=page]:shadow-[inset_3px_0_0_var(--identity)]");
    expect(current?.className).toContain("aria-[current=page]:[&_svg]:text-identity");
    const brand = document.querySelector("svg path.stroke-identity");
    expect(brand).not.toBeNull();
    const beads = Array.from(brand?.parentElement?.querySelectorAll("circle") ?? []).map((c) => c.getAttribute("class"));
    expect(beads).toEqual(["fill-state-done", "fill-state-progress", "fill-card stroke-state-ready"]);
  });
});
