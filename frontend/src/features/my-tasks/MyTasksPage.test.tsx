import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { EMAIL_KEY, resetIdentity, setEmail } from "@/app/identity";
import { bead, json, milestoneOption, project as projectEntry, projectMilestones, stubBeads } from "@/features/beads/beadFixtures";

const EMAIL = "giangdhwhtbr@gmail.com";

beforeEach(() => setEmail(EMAIL));
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
const rows = () => screen.getAllByRole("row").slice(1);

describe("MyTasksPage", () => {
  it("REQ-UI-099 the My Tasks link opens /my-tasks and is current", async () => {
    stubBeads(() => json([]));
    open("/");
    const link = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "My Tasks" });
    await userEvent.click(link);
    expect(window.location.pathname).toBe("/my-tasks");
    expect(await screen.findByRole("heading", { name: "My Tasks" })).toBeInTheDocument();
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-100 lists only my beads with project and count", async () => {
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
    for (const row of rows()) expect(within(row).getByText("alpha")).toBeInTheDocument();
  });

  it("REQ-UI-100 My Tasks does not request /api/projects", async () => {
    const fetchMock = stubBeads(() => json([bead("a-1", { assignee: "giangdhwhtbr" })]));
    open("/my-tasks");
    await screen.findByText("1 task");
    const urls = fetchMock.mock.calls.map(([input]) => new URL(requested(input), "http://localhost").pathname);
    expect(urls).toContain("/api/projects/beads");
    expect(urls).not.toContain("/api/projects");
  });

  it("REQ-UI-100 rows across projects in order and linked", async () => {
    stubBeads(
      (url) =>
        json(
          url.searchParams.get("project") === "A"
            ? [bead("a-1", { assignee: "giangdhwhtbr", priority: 2, updated_at: "2026-11-10T00:00:00Z" })]
            : [bead("b-1", { assignee: "giangdhwhtbr", priority: 1, updated_at: "2026-11-03T00:00:00Z" })],
        ),
      ["A", "B"],
    );
    open("/my-tasks");
    await screen.findByText("2 tasks");
    expect(within(rows()[0]).getByText("B")).toBeInTheDocument();
    expect(within(rows()[1]).getByRole("link")).toHaveAttribute("href", "/beads/A/a-1");
  });

  it("REQ-UI-103 one note per stale project", async () => {
    const entry = (name: string, stale: boolean) => ({
      name,
      path: `/home/gin/${name}`,
      exists: true,
      beads: { open: 0, in_progress: 0, blocked: 0, ready: 0, epics: [], stale },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = new URL(requested(input), "http://localhost");
        if (url.pathname === "/api/projects/beads") return Promise.resolve(json([entry("A", true), entry("B", false)]));
        const name = url.searchParams.get("project") ?? "";
        return Promise.resolve(json([bead(`${name.toLowerCase()}-1`, { assignee: "giangdhwhtbr" })]));
      }),
    );
    open("/my-tasks");
    await screen.findByText("2 tasks");
    const notes = screen.getAllByRole("alert");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent("Beads of A may be out of date.");
    expect(screen.queryByText(/Beads of B/)).not.toBeInTheDocument();
    expect(rows()).toHaveLength(2);
  });

  it("REQ-UI-100 nothing assigned", async () => {
    stubBeads(() => json([bead("a-1", { assignee: "alice" })]));
    open("/my-tasks");
    expect(await screen.findByText(`No tasks assigned to ${EMAIL}`)).toBeInTheDocument();
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

  it("REQ-UI-101 Show closed", async () => {
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
    expect(window.location.search).toBe("?closed=1");
    expect(await screen.findByText("2 tasks")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => requested(input).includes("closed=1"))).toBe(true);
  });

  it("REQ-UI-102 one project fails", async () => {
    stubBeads(
      (url) =>
        url.searchParams.get("project") === "B"
          ? json({ error: "bd failed" }, 500)
          : json([bead("a-1", { assignee: "giangdhwhtbr" }), bead("a-2", { assignee: "giangdhwhtbr" })]),
      ["A", "B"],
    );
    open("/my-tasks");
    expect(await screen.findByRole("alert")).toHaveTextContent("B");
    expect(rows()).toHaveLength(2);
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
    const stub = (milestones: (url: URL) => Response | Promise<Response> = () => json(milestonesOfA)) => {
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

    it("REQ-UI-105 All projects", async () => {
      stub();
      open("/my-tasks");
      expect(await screen.findByText("A in m2")).toBeInTheDocument();
      expect(screen.getByText("B task")).toBeInTheDocument();
      expect(screen.getByLabelText("Project")).toHaveValue("");
      expect(screen.getByLabelText("Milestone")).toBeDisabled();
    });

    it("REQ-UI-105 project with a current milestone", async () => {
      const fetchMock = stub();
      open("/my-tasks");
      await userEvent.selectOptions(await screen.findByLabelText("Project"), "A");
      expect(window.location.pathname + window.location.search).toBe("/my-tasks?project=A");
      expect(await screen.findByText("A in m2")).toBeInTheDocument();
      await waitFor(() => expect(screen.getByLabelText("Milestone")).toHaveValue("m2"));
      expect(screen.queryByText("A in m3")).toBeNull();
      expect(screen.queryByText("B task")).toBeNull();
      expect(urlsOf(fetchMock)).toContain("/api/beads/milestones?project=A");
      expect(urlsOf(fetchMock).filter((u) => u.startsWith("/api/beads?project=B")).length).toBe(1);
    });

    it("REQ-UI-105 change project clears the milestone", async () => {
      stub((url) =>
        json(url.searchParams.get("project") === "A" ? milestonesOfA : projectMilestones([milestoneOption("b-m", "active")], "b-m")),
      );
      open("/my-tasks?project=A&milestone=m3");
      expect(await screen.findByText("A in m3")).toBeInTheDocument();
      await userEvent.selectOptions(screen.getByLabelText("Project"), "B");
      expect(window.location.pathname + window.location.search).toBe("/my-tasks?project=B");
      await waitFor(() => expect(screen.getByLabelText("Milestone")).toHaveValue("b-m"));
    });

    it("REQ-UI-105 closed milestone lists closed tasks", async () => {
      const fetchMock = stub();
      open("/my-tasks?project=A");
      await screen.findByText("A in m2");
      await userEvent.selectOptions(screen.getByLabelText("Milestone"), "m1");
      expect(await screen.findByText("A in m1")).toBeInTheDocument();
      expect(screen.queryByText("A in m2")).toBeNull();
      expect(urlsOf(fetchMock).some((u) => u.startsWith("/api/beads?project=A") && u.includes("closed=1"))).toBe(true);
      expect(urlsOf(fetchMock).some((u) => u.startsWith("/api/beads?project=B"))).toBe(false);
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
      await userEvent.selectOptions(await screen.findByLabelText("Project"), "B");
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
