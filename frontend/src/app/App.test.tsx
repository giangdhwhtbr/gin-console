import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bead } from "@/features/beads/beadFixtures";
import { clearOrigin } from "@/app/origin";
import { App } from "./App";
import { forgetConfiguredProjects } from "./project";
import { clearEmail, EMAIL_KEY, resetIdentity, setEmail } from "./identity";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const alpha = () => json([{ name: "alpha", path: "/home/gin/alpha", exists: true, beads: null }]);

beforeEach(() => {
  forgetConfiguredProjects();
  clearOrigin();
  setEmail("tester@example.com");
});

afterEach(() => {
  cleanup();
  localStorage.removeItem(EMAIL_KEY);
  resetIdentity();
  vi.unstubAllGlobals();
});

describe("App routing", () => {
  it("REQ-UI-097 without an email every URL shows the login screen", () => {
    clearEmail();
    window.history.replaceState(null, "", "/beads?project=gin-console");
    render(<App />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
  });

  it("REQ-UI-097 signing in shows the page of the URL", async () => {
    clearEmail();
    window.history.replaceState(null, "", "/beads?project=gin-console");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "tester@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(window.location.pathname + window.location.search).toBe("/beads?project=gin-console");
    expect(await screen.findByRole("heading", { name: "Beads" })).toBeInTheDocument();
  });

  it("REQ-UI-097 a remembered email skips the login screen", () => {
    window.history.replaceState(null, "", "/beads");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull();
  });

  it("REQ-UI-098 Log out shows the login screen and keeps the URL", async () => {
    window.history.replaceState(null, "", "/beads");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await userEvent.click(screen.getAllByRole("button", { name: /^Log out/ })[0]);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(localStorage.getItem(EMAIL_KEY)).toBeNull();
    expect(window.location.pathname).toBe("/beads");
  });

  it("REQ-UI-096 Refresh drops the server caches, then the page loads its data again", async () => {
    window.history.replaceState(null, "", "/milestones");
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(json([])));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    await screen.findByText(/no projects configured/i);
    const projectLoads = () => fetchMock.mock.calls.filter(([url]) => url === "/api/projects/beads").length;
    const before = projectLoads();
    expect(before).toBeGreaterThan(0);
    const [button] = screen.getAllByRole("button", { name: "Refresh data" });
    await userEvent.click(button);
    await screen.findByText(/no projects configured/i);
    expect(fetchMock).toHaveBeenCalledWith("/api/refresh", { method: "POST" });
    const refreshAt = fetchMock.mock.calls.findIndex(([url]) => url === "/api/refresh");
    expect(fetchMock.mock.calls.slice(refreshAt + 1).some(([url]) => url === "/api/projects/beads")).toBe(true);
    expect(projectLoads()).toBeGreaterThan(before);
    expect(window.location.pathname).toBe("/milestones");
  });

  it("REQ-UI-055 opens Milestones from the sidebar without a reload", async () => {
    window.history.replaceState(null, "", "/beads");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await screen.findByText(/no projects configured/i);
    await userEvent.click(screen.getByRole("link", { name: "Milestones" }));
    expect(window.location.pathname).toBe("/milestones");
    expect(await screen.findByRole("heading", { name: "Milestones" })).toBeInTheDocument();
  });

  // REQ-UI-057
  it("REQ-UI-057 renders the milestone page on /milestones/:project/:id and marks Milestones", async () => {
    window.history.replaceState(null, "", "/milestones/alpha/m-1");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "no milestone command", cause: "outdated" }))));
    render(<App />);
    expect(await screen.findByRole("link", { name: "Milestones in alpha" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Milestones" })).toHaveAttribute("aria-current", "page");
  });

  // REQ-UI-057, REQ-UI-125
  it("REQ-UI-057 shows Page not found for the address of a retired page or an unknown one", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    for (const path of ["/nope", "/sessions", "/sessions/alpha/s-1", "/quota"]) {
      window.history.replaceState(null, "", path);
      render(<App />);
      await screen.findByRole("heading", { name: "Page not found" });
      expect(screen.getByText(path)).toBeInTheDocument();
      expect(document.title).toBe("Page not found · gin-console");
      const main = screen.getByRole("navigation", { name: "Main" });
      expect(within(main).queryAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")).toEqual([]);
      cleanup();
    }
  });

  it("REQ-UI-088 REQ-UI-095 every path under /reports is the Reports page: a section, /reports, or the not-found page", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    window.history.replaceState(null, "", "/reports/delivery");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("aria-current", "page");
    cleanup();
    const before = window.history.length;
    window.history.replaceState(null, "", "/reports?tab=quality");
    render(<App />);
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/reports/rework"));
    expect(window.history.length).toBe(before);
    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    cleanup();
    window.history.replaceState(null, "", "/reports/nope");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("/reports/nope")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Page not found · gin-console"));
  });

  it("REQ-UI-099 / is replaced by My work of the current project without a history entry", async () => {
    window.history.replaceState(null, "", "/");
    const before = window.history.length;
    vi.stubGlobal("fetch", vi.fn(() => alpha()));
    render(<App />);
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/my-tasks?project=alpha"));
    expect(window.history.length).toBe(before);
    expect(screen.queryByRole("heading", { name: "Page not found" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Projects" })).toBeNull();
  });

  it("REQ-UI-099 / when the project list cannot be loaded is replaced by /my-tasks", async () => {
    window.history.replaceState(null, "", "/");
    const before = window.history.length;
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    render(<App />);
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/my-tasks"));
    expect(window.history.length).toBe(before);
  });

  it("REQ-UI-099 /?project=beta is replaced by My work of beta", async () => {
    window.history.replaceState(null, "", "/?project=beta");
    const before = window.history.length;
    vi.stubGlobal("fetch", vi.fn(() => json([
      { name: "alpha", path: "/a", exists: true, beads: null },
      { name: "beta", path: "/b", exists: true, beads: null },
    ])));
    render(<App />);
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/my-tasks?project=beta"));
    expect(window.history.length).toBe(before);
  });

  it("REQ-UI-099 / without projects is replaced by /my-tasks", async () => {
    window.history.replaceState(null, "", "/");
    const before = window.history.length;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/my-tasks"));
    expect(window.history.length).toBe(before);
  });

  it.each<[string, string]>([
    ["/beads?project=alpha", "Beads · alpha · gin-console"],
    ["/milestones?project=alpha", "Milestones · alpha · gin-console"],
    ["/reports/rework?project=alpha", "Reports · Rework · alpha · gin-console"],
    ["/reports/status?project=alpha", "Reports · Status · alpha · gin-console"],
    ["/reports/team?project=alpha", "Reports · Team · alpha · gin-console"],
    ["/reports/delivery?project=alpha", "Reports · Delivery · alpha · gin-console"],
    ["/reports/velocity?project=alpha", "Reports · Velocity · alpha · gin-console"],
    ["/my-tasks", "My work · gin-console"],
    ["/my-tasks?project=alpha", "My work · alpha · gin-console"],
  ])("REQ-UI-063 titles %s", async (path, title) => {
    vi.stubGlobal("fetch", vi.fn(() => alpha()));
    window.history.replaceState(null, "", path);
    render(<App />);
    await waitFor(() => expect(document.title).toBe(title), { timeout: 3000 });
  });

  it("REQ-UI-063 the login page keeps the loading title", () => {
    clearEmail();
    window.history.replaceState(null, "", "/beads?project=alpha");
    render(<App />);
    expect(document.title).toBe("gin-console");
  });

  // REQ-UI-022
  it("REQ-UI-022 opens the beads list from the sidebar without a reload and follows back", async () => {
    window.history.replaceState(null, "", "/my-tasks?project=alpha");
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(url.includes("/api/projects/beads") ? alpha() : json([]))));
    render(<App />);
    await screen.findByRole("heading", { name: "My work" });
    await userEvent.click(screen.getByRole("link", { name: "Beads" }));
    expect(window.location.pathname).toBe("/beads");
    expect(await screen.findByRole("heading", { name: "Beads" })).toBeInTheDocument();
    act(() => window.history.back());
    await screen.findByRole("heading", { name: "My work" });
    expect(window.location.pathname).toBe("/my-tasks");
  });

  // REQ-UI-022
  it("REQ-UI-022 shows Page not found on undecodable route segment and marks the Beads link on /beads", async () => {
    window.history.replaceState(null, "", "/beads/%E0%A4%A/x");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await screen.findByRole("heading", { name: "Page not found" });

    cleanup();
    window.history.replaceState(null, "", "/beads");
    render(<App />);
    const beadsLink = screen.getByRole("link", { name: "Beads" });
    expect(beadsLink).toHaveAttribute("aria-current", "page");
  });

  // REQ-UI-022
  it("REQ-UI-022 renders the bead page on /beads/:project/:id", async () => {
    window.history.replaceState(null, "", "/beads/alpha/a-5");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/projects/beads")) return Promise.resolve(alpha());
        if (url.includes("/api/beads/alpha/a-5")) {
          return Promise.resolve(
            json({
              id: "a-5",
              title: "Bead five",
              status: "open",
              priority: 1,
              issue_type: "task",
              labels: [],
              owner: null,
              assignee: null,
              parent: null,
              created_at: "2026-10-01T00:00:00Z",
              updated_at: "2026-10-10T00:00:00Z",
              dependency_count: 0,
              dependent_count: 0,
              comment_count: 0,
              closed_at: null,
              ready: false,
              blocked: false,
              created_by: null,
              blocked_by: [],
              child_counts: { total: 0, closed: 0, prep_total: 0, prep_closed: 0 },
              description: null,
              design: null,
              notes: null,
              acceptance_criteria: null,
              close_reason: null,
              dependencies: [],
              dependents: [],
              children: [],
              bugs: [],
            }),
          );
        }
        return Promise.resolve(json([]));
      }),
    );
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Bead five" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("link", { name: "Beads" })).toHaveAttribute(
      "href",
      "/beads?project=alpha",
    );
  });

  it("REQ-UI-075 old Dependencies links are replaced by the Graph view, the epic page or the bead's place", async () => {
    const beads = [bead("a-1", { issue_type: "epic" }), bead("a-5", { parent: "a-1" })];
    const cases: [string, string][] = [
      ["/beads/alpha/graph", "/beads?project=alpha&view=graph"],
      ["/beads/alpha/a-1/graph?select=a-5", "/beads/alpha/a-1?tab=graph&select=a-5"],
      ["/beads/alpha/a-5/graph", "/beads?project=alpha&view=graph&scope=a-1&select=a-5"],
    ];
    const fetchMock = vi.fn<(url: string) => Promise<Response>>((url) =>
      Promise.resolve(json(String(url).startsWith("/api/beads?") ? beads : [])),
    );
    vi.stubGlobal("fetch", fetchMock);
    for (const [from, to] of cases) {
      window.history.replaceState(null, "", from);
      const before = window.history.length;
      render(<App />);
      await waitFor(() => expect(window.location.pathname + window.location.search).toBe(to));
      expect(window.history.length).toBe(before);
      cleanup();
    }
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/api/beads/alpha/graph"))).toBe(false);
  });

  it("REQ-UI-075 Project: opening /beads/alpha/graph directly renders the Graph view, not Loading", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    window.history.replaceState(null, "", "/beads/alpha/graph");
    render(<App />);
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/beads?project=alpha&view=graph"));
    expect(await screen.findByRole("heading", { name: "Beads" })).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  // REQ-UI-022
  it("REQ-UI-022 shows Page not found on undecodable bead route segment", async () => {
    window.history.replaceState(null, "", "/beads/%E0%A4%A/a-5");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await screen.findByRole("heading", { name: "Page not found" });
  });
  // REQ-UI-029
  it("REQ-UI-029 a late response for the previous bead never replaces the current one", async () => {
    window.history.replaceState(null, "", "/beads/alpha/a-5");
    const detail = (id: string) =>
      json({
        id,
        title: `Bead ${id}`,
        status: "open",
        priority: 1,
        issue_type: "task",
        labels: [],
        owner: null,
        assignee: null,
        parent: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-10T00:00:00Z",
        dependency_count: 0,
        dependent_count: 0,
        comment_count: 0,
        closed_at: null,
        ready: false,
        blocked: false,
        created_by: null,
        blocked_by: [],
        child_counts: { total: 0, closed: 0, prep_total: 0, prep_closed: 0 },
        description: null,
        design: null,
        notes: null,
        acceptance_criteria: null,
        close_reason: null,
        dependencies: [],
        dependents: [],
        children: [],
        bugs: [],
      });
    let releaseFirst: (response: Response) => void = () => undefined;
    const first = new Promise<Response>((resolve) => {
      releaseFirst = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/projects/beads")) return Promise.resolve(alpha());
        if (url.includes("/api/beads/alpha/a-5")) return first;
        if (url.includes("/api/beads/alpha/a-6")) return Promise.resolve(detail("a-6"));
        return Promise.resolve(json([]));
      }),
    );
    render(<App />);
    act(() => {
      window.history.pushState(null, "", "/beads/alpha/a-6");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findByRole("heading", { name: "Bead a-6" })).toBeInTheDocument();
    await act(async () => {
      releaseFirst(detail("a-5"));
      await first;
    });
    expect(screen.getByRole("heading", { name: "Bead a-6" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bead a-5" })).not.toBeInTheDocument();
  });

  // REQ-UI-040
  it("REQ-UI-040 a late comments answer for the previous bead never replaces the current one", async () => {
    window.history.replaceState(null, "", "/beads/alpha/a-5");
    const detail = (id: string) =>
      json({
        id,
        title: `Bead ${id}`,
        status: "open",
        priority: 1,
        issue_type: "task",
        labels: [],
        owner: null,
        assignee: null,
        parent: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-10T00:00:00Z",
        dependency_count: 0,
        dependent_count: 0,
        comment_count: 1,
        closed_at: null,
        ready: false,
        blocked: false,
        created_by: null,
        blocked_by: [],
        child_counts: { total: 0, closed: 0, prep_total: 0, prep_closed: 0 },
        description: null,
        design: null,
        notes: null,
        acceptance_criteria: null,
        close_reason: null,
        dependencies: [],
        dependents: [],
        children: [],
        bugs: [],
      });
    let releaseA5Comments: (response: Response) => void = () => undefined;
    const a5Comments = new Promise<Response>((resolve) => {
      releaseA5Comments = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input instanceof Request ? input.url : input).includes("/api/projects/beads")) return Promise.resolve(alpha());
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes("/api/beads/alpha/a-5/comments")) return a5Comments;
        if (url.includes("/api/beads/alpha/a-5")) return Promise.resolve(detail("a-5"));
        if (url.includes("/api/beads/alpha/a-6/comments")) {
          return Promise.resolve(
            json([
              {
                id: "c-6",
                author: "alice",
                text: "Text of a-6",
                created_at: "2026-10-06T10:00:00Z",
                truncated: false,
              },
            ]),
          );
        }
        if (url.includes("/api/beads/alpha/a-6")) return Promise.resolve(detail("a-6"));
        return Promise.resolve(json([]));
      }),
    );

    render(<App />);
    expect(await screen.findByRole("heading", { name: "Bead a-5" })).toBeInTheDocument();

    act(() => {
      window.history.pushState(null, "", "/beads/alpha/a-6");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByRole("heading", { name: "Bead a-6" })).toBeInTheDocument();
    expect(await screen.findByText("Text of a-6")).toBeInTheDocument();

    await act(async () => {
      releaseA5Comments(
        json([
          {
            id: "c-5",
            author: "alice",
            text: "Text of a-5",
            created_at: "2026-10-05T10:00:00Z",
            truncated: false,
          },
        ]),
      );
      await a5Comments;
    });

    expect(screen.getByText("Text of a-6")).toBeInTheDocument();
    expect(screen.queryByText("Text of a-5")).not.toBeInTheDocument();
  });
});


