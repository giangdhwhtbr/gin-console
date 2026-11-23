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
const rows = () => screen.getAllByRole("row").slice(1);

describe("MyTasksPage", () => {
  it("REQ-UI-105 the filter row wraps on narrow screens", async () => {
    stubBeads(() => json([]));
    open("/my-tasks");
    const box = await screen.findByRole("checkbox", { name: "Show closed" });
    expect(box.closest("div")).toHaveClass("flex-wrap");
  });

  it("REQ-BEADS-018 Failed pull note: one note naming the current project, the list still shown", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr" })]), ["alpha", "omega"]);
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

  it("REQ-UI-099 the My Tasks link opens /my-tasks of the current project and is current", async () => {
    stubBeads(() => json([]));
    open("/beads?project=alpha");
    const link = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "My Tasks" });
    await userEvent.click(link);
    expect(window.location.pathname + window.location.search).toBe("/my-tasks?project=alpha");
    expect(await screen.findByRole("heading", { name: "My Tasks" })).toBeInTheDocument();
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-099 Home address without projects: My Tasks says no projects are configured", async () => {
    stubBeads(() => json([]), []);
    open("/");
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/my-tasks"));
    expect(await screen.findByText("No projects configured.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Show closed" })).toBeNull();
  });

  it("REQ-UI-100 No projects", async () => {
    const fetchMock = stubBeads(() => json([]), []);
    open("/my-tasks");
    expect(await screen.findByText("No projects configured.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => requested(input).startsWith("/api/beads"))).toBe(false);
  });

  it("REQ-UI-100 lists only my beads with count and no Project column", async () => {
    stubBeads(() =>
      json([
        bead("a-1", { assignee: "giangdhwhtbr" }),
        bead("a-2", { assignee: "GiangDHWHTBR@gmail.com" }),
        bead("a-3", { assignee: "alice" }),
        bead("a-4", { owner: EMAIL }),
      ]),
    );
    open("/my-tasks");
    expect(await screen.findByText("2 tasks")).toBeInTheDocument();
    expect(rows()).toHaveLength(2);
    expect(screen.queryByRole("columnheader", { name: "Project" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Project" })).toBeNull();
    expect(window.location.search).toBe("?project=alpha");
  });

  // REQ-UI-100 "Same handle at another domain"
  it("REQ-UI-100 lists a bead assigned to the same handle at another domain", async () => {
    stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr@other.example" }), bead("a-2", { assignee: "alice" })]));
    open("/my-tasks");
    expect(await screen.findByText("1 task")).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it("REQ-UI-100 Not the full projects list: no request to /api/projects", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr" })]));
    open("/my-tasks");
    await screen.findByText("1 task");
    const urls = fetchMock.mock.calls.map(([input]) => new URL(requested(input), "http://localhost").pathname);
    expect(urls).toContain("/api/projects/beads");
    expect(urls).not.toContain("/api/projects");
  });

  it("REQ-UI-100 Order: rows of the current project by priority, linked", async () => {
    stubBeads(() =>
      json([
        bead("a-1", { assignee: "giangdhwhtbr", priority: 2, updated_at: "2026-11-10T00:00:00Z" }),
        bead("a-2", { assignee: "giangdhwhtbr", priority: 1, updated_at: "2026-11-03T00:00:00Z" }),
      ]),
    );
    open("/my-tasks");
    await screen.findByText("2 tasks");
    expect(within(rows()[0]).getByText("a-2")).toBeInTheDocument();
    expect(within(rows()[1]).getByRole("link")).toHaveAttribute("href", "/beads/alpha/a-1");
  });

  it("REQ-UI-100 Other projects left out: no beads request goes to B", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr" })]), ["A", "B"]);
    open("/my-tasks?project=A");
    await screen.findByText("1 task");
    const urls = fetchMock.mock.calls.map(([input]) => requested(input));
    expect(urls.some((u) => u.startsWith("/api/beads?project=A"))).toBe(true);
    expect(urls.some((u) => u.includes("project=B") && !u.startsWith("/api/beads/milestones"))).toBe(false);
  });

  it("REQ-UI-100 nothing assigned: a link opens the Beads page of the current project", async () => {
    stubBeads(() => json([bead("a-1", { assignee: "alice" })]));
    open("/my-tasks");
    expect(await screen.findByText(`No tasks assigned to ${EMAIL}`)).toBeInTheDocument();
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
        return Promise.resolve(json([bead("a-1", { assignee: "giangdhwhtbr" })]));
      }),
    );
    open("/my-tasks?project=A");
    await screen.findByText("1 task");
    const notes = screen.getAllByRole("alert");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent("Beads of A may be out of date.");
    expect(screen.queryByText(/Beads of B/)).not.toBeInTheDocument();
  });

  it("REQ-UI-101 closed hidden by default", async () => {
    const fetchMock = stubBeads((url) =>
      json(
        url.searchParams.has("closed")
          ? [bead("a-1", { assignee: "giangdhwhtbr" }), bead("a-2", { assignee: "giangdhwhtbr", status: "closed" })]
          : [bead("a-1", { assignee: "giangdhwhtbr" })],
      ),
    );
    open("/my-tasks");
    await screen.findByText("1 task");
    const urls = fetchMock.mock.calls.map(([input]) => requested(input));
    expect(urls.filter((u) => u.includes("/api/beads")).length).toBeGreaterThan(0);
    expect(urls.some((u) => u.includes("closed=1"))).toBe(false);
  });

  it("REQ-UI-101 Show closed keeps the project in the URL", async () => {
    const fetchMock = stubBeads((url) =>
      json(
        url.searchParams.has("closed")
          ? [bead("a-1", { assignee: "giangdhwhtbr" }), bead("a-2", { assignee: "giangdhwhtbr", status: "closed" })]
          : [bead("a-1", { assignee: "giangdhwhtbr" })],
      ),
    );
    open("/my-tasks");
    await screen.findByText("1 task");
    await userEvent.click(screen.getByRole("checkbox", { name: "Show closed" }));
    expect(window.location.search).toBe("?project=alpha&closed=1");
    expect(await screen.findByText("2 tasks")).toBeInTheDocument();
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
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr" })]), ["A", "B"]);
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

  describe("filters", () => {
    const MINE = { assignee: "giangdhwhtbr" };
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

    it("REQ-UI-124 My Tasks shows the current project and writes it in the URL", async () => {
      rememberProject("B");
      stub();
      open("/my-tasks");
      expect(await screen.findByText("B task")).toBeInTheDocument();
      expect(window.location.search).toBe("?project=B");
    });

    it("REQ-UI-088 the current project of My Tasks is remembered", async () => {
      stub();
      open("/my-tasks?project=B");
      await screen.findByText("B task");
      expect(resolveProject("", ["A", "B"])).toBe("B");
    });

    it("REQ-UI-123 Choose on My Tasks: the switcher keeps closed and drops milestone", async () => {
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
