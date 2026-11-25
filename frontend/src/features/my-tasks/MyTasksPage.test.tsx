import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { EMAIL_KEY, resetIdentity, setEmail } from "@/app/identity";
import { forgetConfiguredProjects, resolveProject, rememberProject, TAB_PROJECT_KEY } from "@/app/project";
import { bead, json, milestoneOption, project as projectEntry, projectMilestones, stubBeads } from "@/features/beads/beadFixtures";

const EMAIL = "giangdhwhtbr@gmail.com";

beforeEach(() => {
  setEmail(EMAIL);
  forgetConfiguredProjects();
  window.sessionStorage.removeItem(TAB_PROJECT_KEY);
});
afterEach(() => {
  cleanup();
  localStorage.removeItem(EMAIL_KEY);
  resetIdentity();
  vi.unstubAllGlobals();
});

const open = (path: string) => {
  window.history.replaceState(null, "", path);
  render(<App />);
};
const requested = (input: RequestInfo | URL) =>
  typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
/** The switcher of the layout: opens it and picks `name` (REQ-UI-123). */
const choose = async (name: string) => {
  await userEvent.click(await screen.findByRole("button", { name: /\d+ projects$/ }));
  await userEvent.click(await screen.findByRole("button", { name }));
};
const rows = () => screen.getAllByRole("row").filter((row) => row.hasAttribute("data-id"));

describe("MyTasksPage", () => {
  it("REQ-UI-105 the filter row wraps on narrow screens", async () => {
    stubBeads(() => json([]));
    open("/my-tasks");
    const box = await screen.findByRole("checkbox", { name: "Show closed" });
    expect(box.closest("div")).toHaveClass("flex-wrap");
  });

  it("REQ-BEADS-018 Failed pull note: one note naming the current project, the list still shown", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr", ready: true })]), ["alpha", "omega"]);
    const base = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (!requested(input).startsWith("/api/projects/beads")) return base?.(input) ?? Promise.resolve(json({}, 404));
      return Promise.resolve(
        json([
          { ...projectEntry("alpha"), pull: { at: "2026-11-19T10:00:00Z", status: "error", error: "Merge conflict detected" } },
          { ...projectEntry("omega"), pull: { at: "2026-11-19T10:00:00Z", status: "error", error: "Disk full" } },
        ]),
      );
    });
    open("/my-tasks?project=alpha");
    const note = await screen.findByText(/Pulling Beads of alpha failed/);
    expect(note).toHaveTextContent("Pulling Beads of alpha failed: Merge conflict detected. Run bd dolt pull in /home/gin/alpha.");
    expect(screen.queryByText(/Pulling Beads of omega/)).not.toBeInTheDocument();
    expect(await screen.findAllByText("Title a-1")).toHaveLength(1);
  });

  it("REQ-UI-099 the My work link opens /my-tasks of the current project and is current", async () => {
    stubBeads(() => json([]));
    open("/beads?project=alpha");
    const link = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "My work" });
    await userEvent.click(link);
    expect(window.location.pathname + window.location.search).toBe("/my-tasks?project=alpha");
    expect(await screen.findByRole("heading", { name: "My work" })).toBeInTheDocument();
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-099 Home address without projects: the Overview says no projects are configured and the URL stays /", async () => {
    const fetchMock = stubBeads(() => json([]), []);
    const base = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL) =>
      requested(input) === "/api/overview" ? Promise.resolve(json({ generated_at: "2026-11-23T12:00:00Z", aging_days: 3, projects: [] })) : (base?.(input) ?? Promise.resolve(json({}, 404))),
    );
    open("/");
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(await screen.findByText("No projects configured.")).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe("/");
    expect(screen.queryByRole("checkbox", { name: "Show closed" })).toBeNull();
  });

  it("REQ-UI-100 No projects", async () => {
    const fetchMock = stubBeads(() => json([]), []);
    open("/my-tasks");
    expect(await screen.findByText("No projects configured.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => requested(input).startsWith("/api/beads"))).toBe(false);
  });

  it("REQ-UI-100 REQ-UI-150 Match by email or name: mine and unclaimed are listed, alice's is not, no Project column", async () => {
    stubBeads(() =>
      json([
        bead("a-1", { assignee: "giangdhwhtbr", ready: true }),
        bead("a-2", { assignee: "GiangDHWHTBR@gmail.com", ready: true }),
        bead("a-3", { assignee: "alice", ready: true }),
        bead("a-4", { owner: EMAIL, ready: true }),
      ]),
    );
    open("/my-tasks");
    expect(await screen.findByText("3 tasks")).toBeInTheDocument();
    const mine = screen.getByRole("heading", { name: /Assigned to me/ }).closest("section");
    const unclaimed = screen.getByRole("heading", { name: /Unclaimed/ }).closest("section");
    expect(within(mine as HTMLElement).getAllByRole("row").filter((r) => r.hasAttribute("data-id")).map((r) => r.getAttribute("data-id"))).toEqual(["a-1", "a-2"]);
    expect(within(unclaimed as HTMLElement).getByText("a-4")).toBeInTheDocument();
    expect(screen.queryByText("Title a-3")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Project" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Project" })).toBeNull();
    expect(window.location.search).toBe("?project=alpha");
  });

  // REQ-UI-100 "Same handle at another domain"
  it("REQ-UI-100 lists a bead assigned to the same handle at another domain", async () => {
    stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr@other.example", ready: true }), bead("a-2", { assignee: "alice" })]));
    open("/my-tasks");
    expect(await screen.findByText("1 task")).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it("REQ-UI-100 Not the full projects list: no request to /api/projects", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr", ready: true })]));
    open("/my-tasks");
    await screen.findByText("1 task");
    const urls = fetchMock.mock.calls.map(([input]) => new URL(requested(input), "http://localhost").pathname);
    expect(urls).toContain("/api/projects/beads");
    expect(urls).not.toContain("/api/projects");
  });

  it("REQ-UI-100 Order: rows of the current project by priority, linked", async () => {
    stubBeads(() =>
      json([
        bead("a-1", { assignee: "giangdhwhtbr", ready: true, priority: 2, updated_at: "2026-11-10T00:00:00Z" }),
        bead("a-2", { assignee: "giangdhwhtbr", ready: true, priority: 1, updated_at: "2026-11-03T00:00:00Z" }),
      ]),
    );
    open("/my-tasks");
    await screen.findByText("2 tasks");
    expect(within(rows()[0]).getByText("a-2")).toBeInTheDocument();
    expect(within(rows()[1]).getByRole("link")).toHaveAttribute("href", "/beads/alpha/a-1");
  });

  it("REQ-UI-100 Other projects left out: no beads request goes to B", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr", ready: true })]), ["A", "B"]);
    open("/my-tasks?project=A");
    await screen.findByText("1 task");
    const urls = fetchMock.mock.calls.map(([input]) => requested(input));
    expect(urls.some((u) => u.startsWith("/api/beads?project=A"))).toBe(true);
    expect(urls.some((u) => u.includes("project=B") && !u.startsWith("/api/beads/milestones"))).toBe(false);
  });

  it("REQ-UI-100 REQ-UI-150 Nothing assigned and Deferred only: the message, no groups, a link opens the Beads page of the current project", async () => {
    stubBeads(() => json([bead("a-1", { assignee: "alice", ready: true }), bead("a-2", { assignee: "giangdhwhtbr" })]));
    open("/my-tasks");
    expect(await screen.findByText(`No work for ${EMAIL}`)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Assigned to me/ })).toBeNull();
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.getByRole("link", { name: "Open the Beads page" })).toHaveAttribute("href", "/beads?project=alpha");
  });

  it("REQ-UI-103 the stale note names the current project only", async () => {
    const entry = (name: string) => ({
      name,
      path: `/home/gin/${name}`,
      exists: true,
      beads: { open: 0, in_progress: 0, blocked: 0, ready: 0, epics: [], stale: true },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = new URL(requested(input), "http://localhost");
        if (url.pathname === "/api/projects/beads") return Promise.resolve(json([entry("A"), entry("B")]));
        return Promise.resolve(json([bead("a-1", { assignee: "giangdhwhtbr", ready: true })]));
      }),
    );
    open("/my-tasks?project=A");
    await screen.findByText("1 task");
    const notes = screen.getAllByRole("alert");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent("Beads of A may be out of date.");
    expect(screen.queryByText(/Beads of B/)).not.toBeInTheDocument();
  });

  it("REQ-UI-101 Closed hidden by default", async () => {
    const fetchMock = stubBeads((url) =>
      json(
        url.searchParams.has("closed")
          ? [bead("a-1", { assignee: "giangdhwhtbr", ready: true }), bead("a-2", { assignee: "giangdhwhtbr", status: "closed", ready: false })]
          : [bead("a-1", { assignee: "giangdhwhtbr", ready: true })],
      ),
    );
    open("/my-tasks");
    await screen.findByText("1 task");
    expect(screen.queryByRole("heading", { name: /Closed/ })).toBeNull();
    const urls = fetchMock.mock.calls.map(([input]) => requested(input));
    expect(urls.filter((u) => u.includes("/api/beads")).length).toBeGreaterThan(0);
    expect(urls.some((u) => u.includes("closed=1"))).toBe(false);
  });

  it("REQ-UI-101 Show closed: Closed group, keeps the project in the URL", async () => {
    const fetchMock = stubBeads((url) =>
      json(
        url.searchParams.has("closed")
          ? [bead("a-1", { assignee: "giangdhwhtbr", ready: true }), bead("a-2", { assignee: "giangdhwhtbr", status: "closed", ready: false })]
          : [bead("a-1", { assignee: "giangdhwhtbr", ready: true })],
      ),
    );
    open("/my-tasks");
    await screen.findByText("1 task");
    await userEvent.click(screen.getByRole("checkbox", { name: "Show closed" }));
    expect(window.location.search).toBe("?project=alpha&closed=1");
    expect(await screen.findByText("2 tasks")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Closed 1$/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => requested(input).includes("closed=1"))).toBe(true);
  });

  it("REQ-UI-102 the current project fails: its name in the error, no rows", async () => {
    stubBeads(() => json({ error: "bd failed" }, 500), ["A", "B"]);
    open("/my-tasks?project=A");
    expect(await screen.findByRole("alert")).toHaveTextContent("A");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("REQ-UI-102 projects fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(json({}, new URL(requested(input), "http://localhost").pathname === "/api/projects/beads" ? 500 : 200)),
      ),
    );
    open("/my-tasks");
    expect(await screen.findByText("Projects could not be loaded")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("table")).toBeNull());
  });

  it("REQ-UI-126 an unknown ?project= shows the notice and no list", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr", ready: true })]), ["A", "B"]);
    open("/my-tasks?project=zzz");
    expect(await screen.findByText("No project zzz is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute("href", "/my-tasks?project=B");
    expect(screen.queryByRole("table")).toBeNull();
    expect(window.location.search).toBe("?project=zzz");
    expect(fetchMock.mock.calls.some(([input]) => requested(input).startsWith("/api/beads?"))).toBe(false);
  });

  it("REQ-UI-140 Table row: a blocked bead shows Blocked as text", async () => {
    stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr", blocked: true })]));
    open("/my-tasks");
    await screen.findByText("1 task");
    const mark = within(rows()[0]).getByText("Blocked");
    expect(mark.closest("[data-state]")).toHaveAttribute("data-state", "blocked");
    expect(mark.closest("[data-state]")?.className).not.toMatch(/\b(border|bg-)/);
  });

  describe("groups", () => {
    const ann = "ann@x.com";
    const set = [
      bead("t-1", { assignee: "ann", ready: true }),
      bead("t-2", { ready: true }),
      bead("t-3", { assignee: "ann", status: "in_progress" }),
      bead("t-4", { assignee: "ann", blocked: true, blocked_by: ["t-9", "t-5", "t-10"] }),
      bead("t-5", { title: "Set up CI", assignee: "bob", status: "in_progress" }),
      bead("t-6", { assignee: "bob", blocked: true, blocked_by: ["t-3"] }),
      bead("t-9", { title: "Zeta", assignee: "bob", status: "in_progress" }),
      bead("t-10", { title: "Alpha", assignee: "bob", status: "in_progress" }),
    ];
    const section = (name: RegExp) => within(screen.getByRole("heading", { name }).closest("section") as HTMLElement);

    it("REQ-UI-150 REQ-UI-100 Each group has a heading with its count and the Next up heading holds two", async () => {
      setEmail(ann);
      stubBeads(() => json(set));
      open("/my-tasks");
      await screen.findByText("Title t-1");
      expect(screen.getByRole("heading", { level: 2, name: "Next up" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: "Assigned to me 1" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: "Unclaimed 1" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "In progress 1" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Blocked 1" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Waiting on me 1" })).toBeInTheDocument();
      expect(section(/Assigned to me/).getByText("t-1")).toBeInTheDocument();
      expect(section(/Unclaimed/).getByText("t-2")).toBeInTheDocument();
      expect(section(/In progress/).getByText("t-3")).toBeInTheDocument();
      expect(section(/^Blocked/).getByText("t-4")).toBeInTheDocument();
      expect(section(/Waiting on me/).getByText("t-6")).toBeInTheDocument();
      expect(screen.queryByText("t-5")).toBeNull();
      expect(screen.getByText("5 tasks")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /Closed/ })).toBeNull();
    });

    it("REQ-UI-100 Blocker named: Blocked by the first open blocker by id and +n, Waits on my bead", async () => {
      setEmail(ann);
      stubBeads(() => json(set));
      open("/my-tasks");
      await screen.findByText("Title t-1");
      expect(section(/^Blocked/).getByText("Blocked by Set up CI +2")).toBeInTheDocument();
      expect(section(/Waiting on me/).getByText("Waits on Title t-3")).toBeInTheDocument();
    });

    it("REQ-UI-150 Empty group: the heading and Nothing here", async () => {
      stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr", ready: true })]));
      open("/my-tasks");
      await screen.findByText("1 task");
      expect(section(/In progress/).getByText("Nothing here")).toBeInTheDocument();
      expect(section(/Assigned to me/).getByText("a-1")).toBeInTheDocument();
    });

    it("REQ-UI-150 Prep task and Epic left out", async () => {
      stubBeads(() =>
        json([
          bead("a-1", { ready: true, labels: ["prep"] }),
          bead("a-2", { ready: true, labels: ["prep", "track:2"] }),
          bead("a-3", { ready: true, issue_type: "epic" }),
        ]),
      );
      open("/my-tasks");
      await screen.findByText("1 task");
      expect(section(/Unclaimed/).getByText("a-2")).toBeInTheDocument();
      expect(screen.queryByText("a-1")).toBeNull();
      expect(screen.queryByText("a-3")).toBeNull();
    });

    it("REQ-UI-101 Show closed: the Closed group holds my closed beads after the others", async () => {
      stubBeads(() =>
        json([
          bead("a-1", { assignee: "giangdhwhtbr", ready: true }),
          bead("a-2", { assignee: "giangdhwhtbr", status: "closed", closed_at: "2026-11-02T00:00:00Z" }),
          bead("a-3", { assignee: "giangdhwhtbr", status: "closed", closed_at: "2026-11-05T00:00:00Z" }),
        ]),
      );
      open("/my-tasks?project=alpha&closed=1");
      await screen.findByText("3 tasks");
      const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(headings.at(-1)).toBe("Closed 2");
      expect(section(/^Closed/).getAllByRole("row").filter((r) => r.hasAttribute("data-id")).map((r) => r.getAttribute("data-id"))).toEqual(["a-3", "a-2"]);
    });

    it("REQ-UI-153 Phone: a card with id, P<n>, link and state, no table, at 390px", async () => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: Number(/min-width: (\d+)px/.exec(query)?.[1]) <= 390,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      stubBeads(() => json([bead("t-1", { title: "Set up CI", assignee: "giangdhwhtbr", ready: true, priority: 1 })]));
      open("/my-tasks");
      const card = (await screen.findByRole("link", { name: "Set up CI" })).closest("li") as HTMLElement;
      expect(within(card).getByText("t-1")).toBeInTheDocument();
      expect(within(card).getByText("P1")).toBeInTheDocument();
      expect(within(card).getByText("Ready")).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("REQ-UI-153 Wide window: a table row and no card at 1024px", async () => {
      vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
      stubBeads(() => json([bead("t-1", { title: "Set up CI", assignee: "giangdhwhtbr", ready: true })]));
      open("/my-tasks");
      await screen.findByRole("table");
      expect(rows()).toHaveLength(1);
      expect(screen.queryByRole("listitem")).toBeNull();
    });
  });

  describe("filters", () => {
    const MINE = { assignee: "giangdhwhtbr", ready: true };
    const milestonesOfA = projectMilestones(
      [milestoneOption("m1", "closed"), milestoneOption("m2", "active"), milestoneOption("m3", "planned")],
      "m2",
    );
    const beadsOf = (url: URL) =>
      json(
        url.searchParams.get("project") === "A"
          ? [
              bead("a-1", { ...MINE, title: "A in m2", milestone: "m2" }),
              bead("a-2", { ...MINE, title: "A in m3", milestone: "m3" }),
              ...(url.searchParams.has("closed") ? [bead("a-3", { ...MINE, title: "A in m1", status: "closed", milestone: "m1" })] : []),
            ]
          : [bead("b-1", { ...MINE, title: "B task", milestone: "b-m" })],
      );
    const milestonesOfB = projectMilestones([milestoneOption("b-m", "active")], "b-m");
    const stub = (
      milestones: (url: URL) => Response | Promise<Response> = (url) => json(url.searchParams.get("project") === "A" ? milestonesOfA : milestonesOfB),
    ) => {
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = new URL(requested(input), "http://localhost");
        if (url.pathname === "/api/projects/beads") return Promise.resolve(json([projectEntry("A"), projectEntry("B")]));
        if (url.pathname === "/api/beads") return Promise.resolve(beadsOf(url));
        if (url.pathname === "/api/beads/milestones") return Promise.resolve(milestones(url));
        return Promise.resolve(json({}, 404));
      });
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    };
    const urlsOf = (fetchMock: ReturnType<typeof stub>) => fetchMock.mock.calls.map(([input]) => requested(input));

    it("REQ-UI-105 no project select, the Milestone select is enabled and the current milestone is chosen", async () => {
      const fetchMock = stub();
      open("/my-tasks");
      expect(await screen.findByText("A in m2")).toBeInTheDocument();
      expect(screen.queryByLabelText("Project")).toBeNull();
      await waitFor(() => expect(screen.getByLabelText("Milestone")).toBeEnabled());
      await waitFor(() => expect(screen.getByLabelText("Milestone")).toHaveValue("m2"));
      expect(screen.queryByText("A in m3")).toBeNull();
      expect(screen.queryByText("B task")).toBeNull();
      expect(urlsOf(fetchMock)).toContain("/api/beads/milestones?project=A");
      expect(urlsOf(fetchMock).some((u) => u.startsWith("/api/beads?project=B"))).toBe(false);
    });

    it("REQ-UI-124 My work shows the current project and writes it in the URL", async () => {
      rememberProject("B");
      stub();
      open("/my-tasks");
      expect(await screen.findByText("B task")).toBeInTheDocument();
      expect(window.location.search).toBe("?project=B");
    });

    it("REQ-UI-088 the current project of My work is remembered", async () => {
      stub();
      open("/my-tasks?project=B");
      await screen.findByText("B task");
      expect(resolveProject("", ["A", "B"])).toBe("B");
    });

    it("REQ-UI-123 Choose on My work: the switcher keeps closed and drops milestone", async () => {
      stub((url) =>
        json(url.searchParams.get("project") === "A" ? milestonesOfA : projectMilestones([milestoneOption("b-m", "active")], "b-m")),
      );
      open("/my-tasks?project=A&milestone=m3&closed=1");
      expect(await screen.findByText("A in m3")).toBeInTheDocument();
      await choose("B");
      // REQ-UI-105: a project change clears milestone
      expect(window.location.pathname + window.location.search).toBe("/my-tasks?project=B&closed=1");
      expect(await screen.findByText("B task")).toBeInTheDocument();
      await waitFor(() => expect(screen.getByLabelText("Milestone")).toHaveValue("b-m"));
    });

    it("REQ-UI-105 closed milestone lists closed tasks", async () => {
      const fetchMock = stub();
      open("/my-tasks?project=A");
      await screen.findByText("A in m2");
      await userEvent.selectOptions(screen.getByLabelText("Milestone"), "m1");
      expect(window.location.search).toBe("?project=A&milestone=m1");
      expect(await screen.findByText("A in m1")).toBeInTheDocument();
      expect(screen.queryByText("A in m2")).toBeNull();
      expect(urlsOf(fetchMock).some((u) => u.startsWith("/api/beads?project=A") && u.includes("closed=1"))).toBe(true);
    });

    it("REQ-UI-105 ignores a late milestones answer of a previous project", async () => {
      let release: (response: Response) => void = () => {};
      const late = new Promise<Response>((resolve) => {
        release = resolve;
      });
      stub((url) =>
        url.searchParams.get("project") === "A" ? late : json(projectMilestones([milestoneOption("b-m", "active")], "b-m")),
      );
      open("/my-tasks?project=A");
      await choose("B");
      await waitFor(() => expect(screen.getByLabelText("Milestone")).toHaveValue("b-m"));
      await act(async () => {
        release(json(milestonesOfA));
        await late;
      });
      expect(screen.getByLabelText("Milestone")).toHaveValue("b-m");
      expect(screen.getByText("B task")).toBeInTheDocument();
    });
  });
});
