import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberProject, resolveProject, setFavorite } from "@/app/project";
import { navigate } from "@/app/route";
import type { ProjectBeads } from "@/features/projects/api";
import type { BeadSummary, ProjectMilestones } from "./api";
import { BeadsPage } from "./BeadsPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const bead = (id: string, overrides: Partial<BeadSummary> = {}): BeadSummary => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 2,
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
  milestone: null,
  kind: null,
  capabilities: [],
  complexity: null,
  estimate_minutes: null,
  points: null,
  points_reason: null,
  lane: null,
  track: null,
  claim: null,
  waits_for: null,
  ...overrides,
});

const project = (name: string, exists = true): ProjectBeads => ({
  name,
  path: `/home/gin/${name}`,
  exists,
  beads: null,
});

const withBeads = (name: string, stale?: boolean): ProjectBeads => ({
  ...project(name),
  beads: { open: 0, in_progress: 0, blocked: 0, ready: 0, epics: [], ...(stale === undefined ? {} : { stale }) },
});

const defaultProjects: ProjectBeads[] = [project("alpha", true), project("omega", true), project("ghost", false)];

const stub = (
  beadsHandler: (url: URL) => Response | Promise<Response> = () => json([]),
  projects: ProjectBeads[] = defaultProjects,
  milestonesHandler: (url: URL) => Response | Promise<Response> = () => json({}, 404),
) => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(urlString, "http://localhost");
    if (url.pathname === "/api/projects/beads") {
      return Promise.resolve(json(projects));
    }
    if (url.pathname === "/api/beads/milestones") {
      return Promise.resolve(milestonesHandler(url));
    }
    if (url.pathname === "/api/beads") {
      return Promise.resolve(beadsHandler(url));
    }
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  window.history.replaceState(null, "", "/beads");
  setFavorite(null);
  rememberProject("alpha");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BeadsPage", () => {
  // REQ-UI-023
  it("REQ-UI-023 shows the current project, writes it into the URL and has no select of its own", async () => {
    const mock = stub((url) => {
      const p = url.searchParams.get("project");
      if (p === "alpha") return json([bead("a-1", { title: "Alpha Bead" })]);
      if (p === "omega") return json([bead("o-1", { title: "Omega Bead" })]);
      return json([]);
    });
    render(<BeadsPage />);
    await screen.findByText("Alpha Bead");
    expect(screen.queryByLabelText("Project")).not.toBeInTheDocument();
    expect(window.location.search).toBe("?project=alpha");
    act(() => navigate("/beads?project=omega"));
    expect(await screen.findByText("Omega Bead")).toBeInTheDocument();
    expect(mock).toHaveBeenCalled();
  });

  it("REQ-UI-124 the last chosen project beats the favorite, and is written with replace", async () => {
    setFavorite("alpha");
    rememberProject("omega");
    const replace = vi.spyOn(window.history, "replaceState");
    stub((url) => json([bead("x-1", { title: `Bead of ${url.searchParams.get("project")}` })]));
    render(<BeadsPage />);
    expect(await screen.findByText("Bead of omega")).toBeInTheDocument();
    expect(window.location.search).toBe("?project=omega");
    expect(replace.mock.calls.map((call) => call[2])).toContain("/beads?project=omega");
  });

  it("REQ-UI-124 a project of the URL becomes the current one", async () => {
    window.history.replaceState(null, "", "/beads?project=omega");
    stub(() => json([]));
    render(<BeadsPage />);
    await waitFor(() => expect(resolveProject("", ["alpha", "omega"])).toBe("omega"));
  });

  it("REQ-UI-124 the project holds for the visit when storage refuses writes", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    window.history.replaceState(null, "", "/beads?project=omega");
    stub(() => json([bead("o-1", { title: "Omega Bead" })]));
    render(<BeadsPage />);
    expect(await screen.findByText("Omega Bead")).toBeInTheDocument();
    expect(resolveProject("", ["alpha", "omega"])).toBe("omega");
  });

  it("REQ-UI-126 an unknown project gets a notice with the configured projects and no request for beads", async () => {
    window.history.replaceState(null, "", "/beads?project=zzz");
    const mock = stub(() => json([bead("a-1")]));
    render(<BeadsPage />);
    expect(await screen.findByText("No project zzz is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "omega" })).toHaveAttribute("href", "/beads?project=omega");
    expect(screen.queryByRole("link", { name: "ghost" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?project=zzz");
    expect(mock.mock.calls.some(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url).startsWith("/api/beads?"))).toBe(false);
    expect(resolveProject("", ["alpha", "omega"])).toBe("alpha");
  });

  it("REQ-UI-103 note for the selected stale project", async () => {
    stub(() => json([bead("a-1")]), [withBeads("alpha", true), withBeads("omega", false)]);
    render(<BeadsPage />);
    const note = await screen.findByRole("alert");
    expect(note).toHaveTextContent(
      "Beads of alpha may be out of date. Run bd export -o .beads/issues.jsonl in alpha.",
    );
    expect(await screen.findByText("Title a-1")).toBeInTheDocument();
    act(() => navigate("/beads?project=omega"));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("REQ-UI-103 no note when not stale", async () => {
    stub(() => json([bead("a-1")]), [withBeads("alpha"), withBeads("omega", false)]);
    render(<BeadsPage />);
    expect(await screen.findByText("Title a-1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("REQ-BEADS-018 Failed pull note: one note for the selected project, none for others, list shown", async () => {
    const failed: ProjectBeads = {
      ...withBeads("alpha"),
      pull: { at: "2026-11-19T10:00:00Z", status: "error", error: "Merge conflict detected" },
    };
    stub(() => json([bead("a-1")]), [failed, { ...withBeads("omega"), pull: null }]);
    render(<BeadsPage />);
    const note = await screen.findByRole("alert");
    expect(note).toHaveTextContent(
      "Pulling Beads of alpha failed: Merge conflict detected. Run bd dolt pull in /home/gin/alpha.",
    );
    expect(await screen.findByText("Title a-1")).toBeInTheDocument();
    act(() => navigate("/beads?project=omega"));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("REQ-BEADS-018 a failed pull without an error text reads unknown error", async () => {
    const failed: ProjectBeads = { ...withBeads("alpha"), pull: { at: "2026-11-19T10:00:00Z", status: "error", error: null } };
    stub(() => json([bead("a-1")]), [failed]);
    render(<BeadsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Pulling Beads of alpha failed: unknown error. Run bd dolt pull in /home/gin/alpha.");
  });

  it("REQ-BEADS-018 Older backend: no pull note", async () => {
    stub(() => json([bead("a-1")]), [withBeads("alpha"), { ...withBeads("omega"), pull: { status: "bad" } as never }]);
    render(<BeadsPage />);
    expect(await screen.findByText("Title a-1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("REQ-UI-081 no separate Dependencies entry; the View nav has Graph", async () => {
    stub(() => json([bead("a-1")]));
    render(<BeadsPage />);
    await screen.findByText("Title a-1");
    expect(screen.queryByRole("link", { name: "Dependencies" })).toBeNull();
    expect(within(screen.getByRole("navigation", { name: "View" })).getByRole("button", { name: "Graph" })).toBeInTheDocument();
  });

  it("REQ-UI-030 view=graph shows the Graph view with its tab pressed", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=graph");
    stub(() => json([bead("a-1")]));
    render(<BeadsPage />);
    await screen.findByRole("navigation", { name: "Graph scope" });
    expect(screen.getByRole("button", { name: "Graph" })).toHaveAttribute("aria-pressed", "true");
  });

  describe("Lanes", () => {
    const epic = bead("ex-e12", { issue_type: "epic" });
    const lanesBeads = [
      epic,
      bead("ex-e12.1", { parent: "ex-e12", lane: "be", status: "closed", track: { plan: null, number: 1 } }),
      bead("ex-e12.2", { parent: "ex-e12", lane: "fe", track: { plan: null, number: 2 } }),
    ];

    it("REQ-UI-030 Lanes tab: offered when the scope has lanes, not otherwise", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=graph");
      stub(() => json(lanesBeads.map((b) => ({ ...b, lane: null }))));
      const { unmount } = render(<BeadsPage />);
      await screen.findByRole("navigation", { name: "Graph scope" });
      expect(screen.queryByRole("button", { name: "Lanes" })).toBeNull();
      unmount();
      window.history.replaceState(null, "", "/beads?project=alpha&view=graph&scope=ex-e12");
      stub(() => json(lanesBeads));
      render(<BeadsPage />);
      expect(await screen.findByRole("button", { name: "Lanes" })).toBeInTheDocument();
    });

    it("REQ-UI-030 Lanes tab: choosing Lanes sets view=lanes, keeps the filters and loads the closed beads", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=graph&scope=ex-e12&q=ex");
      const fetchMock = stub((url) => json(url.searchParams.get("closed") === "1" ? lanesBeads : lanesBeads.filter((b) => b.status !== "closed")));
      render(<BeadsPage />);
      await userEvent.click(await screen.findByRole("button", { name: "Lanes" }));
      expect(window.location.search).toContain("view=lanes");
      expect(window.location.search).toContain("q=ex");
      expect(window.location.search).not.toContain("closed");
      await screen.findByRole("navigation", { name: "Lanes scope" });
      await waitFor(() => expect(screen.getByRole("button", { name: /^ex-e12\.1/ })).toBeInTheDocument());
      const asked = fetchMock.mock.calls.map(([u]) => (typeof u === "string" ? u : "")).filter((u) => u.startsWith("/api/beads?"));
      expect(asked.some((u) => u.includes("closed=1"))).toBe(true);
    });

    it("REQ-UI-111 view=lanes without lanes shows the message", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=lanes");
      stub(() => json([bead("a-1")]));
      render(<BeadsPage />);
      expect(await screen.findByText("Lanes show for an epic whose tracks have lanes")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lanes" })).toBeNull();
    });
  });

  describe("REQ-UI-116 Merge gate node", () => {
    const data = [
      bead("ex-e12", { issue_type: "epic" }),
      bead("ex-e12.1", { parent: "ex-e12", lane: "fe", track: { plan: null, number: 1 }, blocked_by: ["ex-e12.9"] }),
      bead("ex-e12.9", {
        parent: "ex-e12",
        title: "external: plan#2",
        waits_for: { plan: "plan", number: 2, track_id: "ex-e12.1", lane: "be" },
      }),
    ];

    it("REQ-UI-116 Merge gate node: a parentless closed gate is a dashed node in the project Graph", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=graph&closed=1");
      stub(() =>
        json([
          bead("ex-g3", { status: "closed", title: "external: plan#3", waits_for: { plan: "plan", number: 3, track_id: "ex-t3", lane: "fe" } }),
          bead("ex-w", { blocked_by: ["ex-g3"] }),
        ]),
      );
      render(<BeadsPage />);
      await screen.findByRole("navigation", { name: "Graph scope" });
      await waitFor(() => expect(document.querySelector('[data-node="ex-g3"]')).not.toBeNull());
      const node = document.querySelector('[data-node="ex-g3"]');
      expect(node).toHaveTextContent("Waits for fe #3 to merge");
      expect(node).toHaveTextContent("Merged");
      expect(node?.className).toContain("border-dashed");
    });

    it("REQ-UI-116 Merge gate chip in lane boxes (Graph through BeadsView)", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=graph&scope=ex-e12");
      stub(() =>
        json([
          data[0],
          bead("ex-e12.2", { parent: "ex-e12", lane: "be", track: { plan: "plan", number: 2 } }),
          bead("ex-e12.4", { parent: "ex-e12", lane: "qa", track: { plan: "plan", number: 4 }, blocked_by: ["ex-e12.9"] }),
          bead("ex-e12.9", {
            parent: "ex-e12",
            title: "external: plan#2",
            waits_for: { plan: "plan", number: 2, track_id: "ex-e12.2", lane: "be" },
          }),
        ]),
      );
      render(<BeadsPage />);
      await screen.findByRole("navigation", { name: "Graph scope" });
      await waitFor(() => expect(document.querySelector('[data-node="ex-e12.2"]')).not.toBeNull());
      expect(document.querySelector('[data-node="ex-e12.9"]')).toBeNull();
      expect(screen.queryByRole("button", { name: /Waits for be #2 to merge/ })).toBeNull();
      expect(document.querySelector('[data-chip="ex-e12.9"]')).toHaveTextContent("Waiting · be #2");
      expect(screen.getByRole("region", { name: "Lane qa" })).toBeInTheDocument();
    });

    it("REQ-UI-116 Merge gate node: the List view of the same data does not show the gate", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=list&q=ex-e12");
      stub(() => json(data));
      render(<BeadsPage />);
      expect(await screen.findByText("Title ex-e12.1")).toBeInTheDocument();
      // q=ex-e12 matches the gate's id too, so the gate is absent only because the List leaves it out
      expect(screen.getByText("2 of 2")).toBeInTheDocument();
      expect(document.querySelector('[data-id="ex-e12.9"]')).toBeNull();
      expect(screen.queryByText("external: plan#2")).toBeNull();
      expect(screen.queryByText(/Waits for/)).toBeNull();
    });
  });

  it("REQ-UI-104 REQ-UI-106 milestone=m2&view=graph draws the milestone's epics, not the milestone bead", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&milestone=m2&view=graph");
    stub(
      () =>
        json([
          bead("m2", { issue_type: "milestone" }),
          bead("e-a", { issue_type: "epic", parent: "m2", milestone: "m2" }),
          bead("e-b", { issue_type: "epic", parent: "m2", milestone: "m2" }),
        ]),
      defaultProjects,
      () => json({ milestones: [{ id: "m2", title: "M2", status: "active", start: null, end: null }], current: null }),
    );
    render(<BeadsPage />);
    expect(await screen.findByRole("button", { name: /^e-a/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^e-b/ })).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    // only the scope breadcrumb names m2, no node does
    expect(screen.getAllByRole("button", { name: /^m2/ })).toHaveLength(1);
    expect(within(screen.getByRole("navigation", { name: "Graph scope" })).getByRole("button", { name: "m2" })).toBeInTheDocument();
  });

  it("REQ-UI-106 a closed Graph panel (select=none) does not open a panel in List", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=graph&select=none");
    stub(() => json([bead("a-1")]));
    render(<BeadsPage />);
    await screen.findByRole("navigation", { name: "Graph scope" });
    await userEvent.click(within(screen.getByRole("navigation", { name: "View" })).getByRole("button", { name: "List" }));
    await screen.findByText("Title a-1");
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
    expect(window.location.search).not.toContain("select");
  });

  it("REQ-UI-106 switching List to Graph keeps the search and loads nothing more", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&q=a-1");
    const fetchMock = stub(() => json([bead("a-1"), bead("a-12", { blocked_by: ["a-1"] }), bead("b-2")]));
    render(<BeadsPage />);
    await screen.findByText("Title a-1");
    const calls = () => fetchMock.mock.calls.filter(([i]) => String(i instanceof Request ? i.url : i).includes("/api/beads?")).length;
    const before = calls();
    await userEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("navigation", { name: "Graph scope" });
    expect(window.location.search).toContain("q=a-1");
    expect(screen.getAllByRole("button", { name: /^a-1/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^b-2/ })).toBeNull();
    expect(calls()).toBe(before);
  });

  it("REQ-MILESTONE-UI-009 list view: milestone not listed and its epics are roots", async () => {
    stub(() =>
      json([
        bead("m-1", { issue_type: "milestone", title: "Milestone M1" }),
        bead("e-a", { parent: "m-1" }),
        bead("e-b", { parent: "m-1" }),
      ]),
    );
    render(<BeadsPage />);
    await screen.findByText("e-a");

    expect(screen.queryByText("m-1")).toBeNull();
    const rows = screen.getAllByRole("treeitem");
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row).toHaveAttribute("aria-level", "1"));
  });

  it("REQ-MILESTONE-UI-009 board view: open epic is on the board and milestone is in no column", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stub(() => json([bead("m-1", { issue_type: "milestone", title: "Milestone M1" }), bead("e-a", { title: "Epic A", issue_type: "epic", parent: "m-1", ready: true })]));
    render(<BeadsPage />);

    const ready = await screen.findByRole("region", { name: "Ready" });
    expect(within(ready).getByText("Epic A")).toBeInTheDocument();
    expect(screen.queryByText("Milestone M1")).toBeNull();
  });

  it("REQ-UI-023 the Beads page does not request /api/projects", async () => {
    const fetchMock = stub(() => json([bead("a-1", { title: "Alpha Bead" })]));
    render(<BeadsPage />);
    await screen.findByText("Alpha Bead");
    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input instanceof Request ? input.url : input), "http://localhost").pathname);
    expect(urls).toContain("/api/projects/beads");
    expect(urls).not.toContain("/api/projects");
  });

  // REQ-UI-023
  it("REQ-UI-023 no projects", async () => {
    stub(() => json([]), []);
    render(<BeadsPage />);
    expect(await screen.findByText(/no projects configured/i)).toBeInTheDocument();
  });

  // REQ-UI-024
  it("REQ-UI-024 row content and order", async () => {
    const yesterday = "2026-10-19T10:00:00Z";
    const lastWeek = "2026-10-12T10:00:00Z";
    const p2 = bead("alpha-p2", {
      priority: 2,
      updated_at: yesterday,
      title: "P2 bead title",
      issue_type: "feature",
      status: "in_progress",
      labels: ["ui", "design"],
      assignee: "alice",
    });
    const p1 = bead("alpha-p1", {
      priority: 1,
      updated_at: lastWeek,
      title: "P1 bead title",
      issue_type: "bug",
      status: "open",
      ready: true,
      labels: ["core"],
      assignee: null,
      owner: "bob",
    });
    stub(() => json([p2, p1]));
    render(<BeadsPage />);
    await screen.findByText("alpha-p1");

    const rows = screen.getAllByRole("treeitem");
    expect(rows[0]).toHaveTextContent("alpha-p1");
    expect(rows[1]).toHaveTextContent("alpha-p2");

    const row1 = within(rows[0]);
    expect(row1.getByText("alpha-p1")).toBeInTheDocument();
    const link1 = row1.getByRole("link", { name: "P1 bead title" });
    expect(link1).toHaveAttribute("href", "/beads/alpha/alpha-p1");
    expect(row1.getByText("bug")).toBeInTheDocument();
    expect(row1.getByText("Ready")).toBeInTheDocument();
    expect(row1.getByText("P1")).toBeInTheDocument();
    expect(row1.getByText("core")).toBeInTheDocument();
    expect(row1.getByText("bob")).toBeInTheDocument();
    expect(row1.getByText(new Date(lastWeek).toLocaleDateString())).toBeInTheDocument();

    const row2 = within(rows[1]);
    expect(row2.getByText("alpha-p2")).toBeInTheDocument();
    const link2 = row2.getByRole("link", { name: "P2 bead title" });
    expect(link2).toHaveAttribute("href", "/beads/alpha/alpha-p2");
    expect(row2.getByText("feature")).toBeInTheDocument();
    expect(row2.getByText("In progress")).toBeInTheDocument();
    expect(row2.getByText("P2")).toBeInTheDocument();
    expect(row2.getByText("ui")).toBeInTheDocument();
    expect(row2.getByText("design")).toBeInTheDocument();
    expect(row2.getByText("alice")).toBeInTheDocument();
    expect(row2.getByText(new Date(yesterday).toLocaleDateString())).toBeInTheDocument();
  });

  // REQ-UI-024
  it("REQ-UI-024 count and empty", async () => {
    const beads: BeadSummary[] = [];
    for (let i = 1; i <= 83; i++) {
      beads.push(
        bead(`b-${i}`, {
          title: i <= 5 ? `Matching task ${i}` : `Other task ${i}`,
          labels: i <= 5 ? ["target"] : [],
        }),
      );
    }
    stub(() => json(beads));
    render(<BeadsPage />);
    await screen.findByText("b-1");
    expect(screen.getByText("83 of 83")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search"), "Matching");
    expect(screen.getByText("5 of 83")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByLabelText("Search"), "nomatchxyz");
    expect(screen.getByText("0 of 83")).toBeInTheDocument();
    expect(screen.getByText(/no beads match/i)).toBeInTheDocument();
  });

  // REQ-UI-025
  it("REQ-UI-025 search and combined filters", async () => {
    const b1 = bead("b-1", { title: "Fix login", status: "open", priority: 1 });
    const b2 = bead("b-2", { title: "Add search", status: "in_progress", priority: 1 });
    const b3 = bead("b-3", { title: "Login crash", status: "in_progress", priority: 2 });
    stub(() => json([b1, b2, b3]));
    render(<BeadsPage />);
    await screen.findByText("Fix login");

    const historyLenBefore = window.history.length;
    await userEvent.type(screen.getByLabelText("Search"), "LOGIN");
    expect(screen.getByText("Fix login")).toBeInTheDocument();
    expect(screen.getByText("Login crash")).toBeInTheDocument();
    expect(screen.queryByText("Add search")).not.toBeInTheDocument();
    expect(window.location.search).toContain("q=LOGIN");
    expect(window.history.length).toBe(historyLenBefore);

    // Open Status popover and check 'open'
    await userEvent.click(screen.getByRole("button", { name: "Status" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "open" }));
    await userEvent.click(screen.getByRole("button", { name: "Status 1" }));

    // Open Priority popover and check 'P1'
    await userEvent.click(screen.getByRole("button", { name: "Priority" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "P1" }));
    await userEvent.click(screen.getByRole("button", { name: "Priority 1" }));

    expect(screen.getByText("Fix login")).toBeInTheDocument();
    expect(screen.queryByText("Login crash")).not.toBeInTheDocument();
    expect(window.location.search).toContain("status=open");
    expect(window.location.search).toContain("priority=1");

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Fix login")).toBeInTheDocument();
    expect(screen.getByText("Add search")).toBeInTheDocument();
    expect(screen.getByText("Login crash")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Priority" })).toBeInTheDocument();
  });

  // REQ-UI-025
  it("REQ-UI-025 restored from the URL", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&status=open&q=fix");
    const b1 = bead("b-1", { title: "Fix login", status: "open" });
    const b2 = bead("b-2", { title: "Fix crash", status: "in_progress" });
    const b3 = bead("b-3", { title: "Add auth", status: "open" });
    stub(() => json([b1, b2, b3]));
    render(<BeadsPage />);
    await screen.findByText("Fix login");

    expect(screen.queryByText("Fix crash")).not.toBeInTheDocument();
    expect(screen.queryByText("Add auth")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveValue("fix");
    expect(screen.getByRole("button", { name: "Status 1" })).toBeInTheDocument();
  });

  // REQ-UI-026
  it("REQ-UI-026 show closed", async () => {
    const openBead = bead("b-1", { title: "Open bead", status: "open" });
    const closedBead = bead("b-2", { title: "Closed bead", status: "closed" });
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects/beads") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        requestedUrls.push(url.search);
        const closed = url.searchParams.get("closed") === "1";
        return Promise.resolve(json(closed ? [openBead, closedBead] : [openBead]));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadsPage />);
    await screen.findByText("Open bead");
    expect(screen.queryByText("Closed bead")).not.toBeInTheDocument();
    expect(requestedUrls[0]).not.toContain("closed=1");

    await userEvent.click(screen.getByLabelText("Show closed"));
    expect(await screen.findByText("Closed bead")).toBeInTheDocument();
    expect(requestedUrls.some((u) => u.includes("closed=1"))).toBe(true);
    expect(window.location.search).toContain("closed=1");

    await userEvent.type(screen.getByLabelText("Search"), "Closed");
    expect(screen.getByText("Closed bead")).toBeInTheDocument();
    expect(screen.queryByText("Open bead")).not.toBeInTheDocument();
  });

  // REQ-UI-027
  it("REQ-UI-027 silent refresh", async () => {
    vi.useFakeTimers();
    let callIndex = 0;
    let failRefresh = false;
    const fetchCalls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects/beads") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        fetchCalls.push(urlString);
        callIndex++;
        if (failRefresh) {
          return Promise.resolve(json({ error: "bd exited 1: boom" }, 500));
        }
        if (callIndex === 1) {
          return Promise.resolve(json([bead("b-1", { title: "Fix login" })]));
        }
        return Promise.resolve(json([bead("b-1", { title: "Renamed" })]));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    const visibilitySpy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(<BeadsPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Fix login")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).toBeNull();

    const callsBeforeHidden = fetchCalls.length;
    visibilitySpy.mockReturnValue("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchCalls.length).toBe(callsBeforeHidden);

    visibilitySpy.mockReturnValue("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchCalls.length).toBe(callsBeforeHidden + 1);

    failRefresh = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("bd exited 1: boom");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  // REQ-UI-029
  it("REQ-UI-029 list error and retry", async () => {
    let attempts = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects/beads") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve(json({ error: "bd not found" }, 502));
        }
        return Promise.resolve(json([bead("b-1", { title: "Success bead" })]));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bd not found");

    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Success bead")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-029
  it("REQ-UI-029 malformed response shows alert and Retry", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects/beads") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        return Promise.resolve(json({ x: 1 }));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unexpected response/i);
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  // REQ-UI-022
  it("REQ-UI-022 plain text in title does not execute script", async () => {
    const maliciousTitle = "<script>window.hacked = 1</script>";
    stub(() => json([bead("b-sec", { title: maliciousTitle })]));
    const { container } = render(<BeadsPage />);
    await screen.findByText(maliciousTitle);
    expect(container.querySelector("script")).toBeNull();
  });
  // REQ-UI-027
  it("REQ-UI-027 a slow older response never overwrites a newer one", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    let releaseOld: (response: Response) => void = () => undefined;
    const old = new Promise<Response>((resolve) => {
      releaseOld = resolve;
    });
    let openCalls = 0;
    stub((url) => {
      if (url.searchParams.get("closed") === "1") {
        return json([bead("o-1", { title: "Open one" }), bead("c-1", { title: "Closed one", status: "closed" })]);
      }
      openCalls += 1;
      return openCalls === 1 ? json([bead("o-1", { title: "Open one" })]) : old;
    });
    render(<BeadsPage />);
    await screen.findByText("Open one");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange")); // a refresh that stays slow
    });
    await userEvent.click(screen.getByLabelText("Show closed"));
    expect(await screen.findByText("Closed one")).toBeInTheDocument();
    await act(async () => {
      releaseOld(json([bead("o-1", { title: "Open one" })]));
      await old;
    });
    expect(screen.getByText("Closed one")).toBeInTheDocument();
  });

  // REQ-UI-027
  it("REQ-UI-027 a stale error never replaces newer data", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    let failOld: (response: Response) => void = () => undefined;
    const old = new Promise<Response>((resolve) => {
      failOld = resolve;
    });
    let calls = 0;
    stub(() => {
      calls += 1;
      if (calls === 1) return json([bead("o-1", { title: "First" })]);
      if (calls === 2) return old;
      return json([bead("o-1", { title: "Newest" })]);
    });
    render(<BeadsPage />);
    await screen.findByText("First");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange")); // second request, slow
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange")); // third request, fast
    });
    await screen.findByText("Newest");
    await act(async () => {
      failOld(json({ error: "bd timed out" }, 502));
      await old;
    });
    expect(screen.getByText("Newest")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("milestone filter", () => {
    const option = (id: string, status: ProjectMilestones["milestones"][number]["status"]) => ({
      id,
      title: `Milestone ${id}`,
      status,
      start: null,
      end: null,
    });
    const milestones = (current: string | null): ProjectMilestones => ({
      milestones: [option("m1", "closed"), option("m2", "active"), option("m3", "planned")],
      current,
    });
    const all = [
      bead("m2", { issue_type: "milestone", title: "Milestone bead", milestone: "m2" }),
      bead("e-2", { issue_type: "epic", title: "Epic two", parent: "m2", milestone: "m2", ready: true }),
      bead("t-2", { title: "Task two", parent: "e-2", milestone: "m2" }),
      bead("e-3", { issue_type: "epic", title: "Epic three", milestone: "m3", ready: true }),
      bead("e-x", { issue_type: "epic", title: "Epic loose", ready: true }),
    ];
    const withMilestones = (current: string | null, beadsHandler: (url: URL) => Response = () => json(all)) =>
      stub(beadsHandler, defaultProjects, () => json(milestones(current)));

    it("REQ-UI-104 defaults to the current milestone", async () => {
      withMilestones("m2");
      render(<BeadsPage />);
      await screen.findByText("Epic two");
      expect(screen.getByLabelText("Milestone")).toHaveValue("m2");
      expect(screen.getByText("Task two")).toBeInTheDocument();
      expect(screen.queryByText("Epic three")).toBeNull();
      expect(screen.queryByText("Epic loose")).toBeNull();
    });

    it("REQ-UI-043 filter by milestone in the List view", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&milestone=m2");
      withMilestones(null);
      render(<BeadsPage />);
      await screen.findByText("Epic two");
      expect(screen.getByText("Task two")).toBeInTheDocument();
      expect(screen.queryByText("Epic loose")).toBeNull();
      expect(screen.queryByText("Epic three")).toBeNull();
      expect(screen.queryByText("Milestone bead")).toBeNull();
    });

    it("REQ-UI-104 filter by milestone applies to the Board view", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=board&milestone=m3");
      withMilestones("m2");
      render(<BeadsPage />);
      await screen.findByText("Epic three");
      expect(screen.queryByText("Epic two")).toBeNull();
      expect(screen.queryByText("Epic loose")).toBeNull();
    });

    it("REQ-UI-104 All and No milestone", async () => {
      withMilestones("m2");
      render(<BeadsPage />);
      await screen.findByText("Epic two");
      await userEvent.selectOptions(screen.getByLabelText("Milestone"), "all");
      expect(window.location.search).toContain("milestone=all");
      expect(await screen.findByText("Epic loose")).toBeInTheDocument();
      expect(screen.getByText("Epic three")).toBeInTheDocument();
      expect(screen.getByText("Epic two")).toBeInTheDocument();
      await userEvent.selectOptions(screen.getByLabelText("Milestone"), "none");
      expect(window.location.search).toContain("milestone=none");
      await waitFor(() => expect(screen.queryByText("Epic two")).toBeNull());
      expect(screen.getByText("Epic loose")).toBeInTheDocument();
      expect(screen.queryByText("Epic three")).toBeNull();
    });

    it("REQ-UI-104 closed milestone fetches closed beads", async () => {
      const closed = [
        bead("c-1", { title: "Done task", status: "closed", closed_at: "2026-09-01T00:00:00Z", milestone: "m1" }),
      ];
      const fetchMock = withMilestones("m2", (url) =>
        url.searchParams.get("closed") === "1" ? json([...all, ...closed]) : json(all),
      );
      render(<BeadsPage />);
      await screen.findByText("Epic two");
      await userEvent.selectOptions(screen.getByLabelText("Milestone"), "m1");
      expect(await screen.findByText("Done task")).toBeInTheDocument();
      const urls = fetchMock.mock.calls.map(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url));
      expect(urls.some((u) => u.startsWith("/api/beads?") && u.includes("closed=1"))).toBe(true);
      expect(screen.queryByRole("checkbox", { name: "Show closed" })).not.toBeChecked();
    });

    it("REQ-UI-104 no current milestone shows All", async () => {
      withMilestones(null);
      render(<BeadsPage />);
      await screen.findByText("Epic loose");
      expect(screen.getByLabelText("Milestone")).toHaveValue("all");
      expect(screen.getByText("Epic three")).toBeInTheDocument();
    });

    it("REQ-UI-104 milestones unavailable", async () => {
      stub(() => json(all), defaultProjects, () => json({ error: "bd failed" }, 502));
      render(<BeadsPage />);
      await screen.findByText("Epic loose");
      expect(await screen.findByRole("option", { name: "Milestones unavailable" })).toBeInTheDocument();
      expect(screen.getByText("Epic three")).toBeInTheDocument();
    });

    it("REQ-UI-104 filter by milestone applies to the Focus view", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=focus&milestone=m2");
      const focus = (id: string, title: string, milestone: string | null) =>
        bead(id, { title, milestone, status: "in_progress" });
      withMilestones("m3", () =>
        json([focus("f-2", "Focus two", "m2"), focus("f-3", "Focus three", "m3"), focus("f-x", "Focus loose", null)]),
      );
      render(<BeadsPage />);
      await screen.findByText("Focus two");
      expect(screen.queryByText("Focus three")).toBeNull();
      expect(screen.queryByText("Focus loose")).toBeNull();
    });

    it("REQ-UI-104 ignores a late milestones answer of another project", async () => {
      let releaseAlpha: (response: Response) => void = () => {};
      const alphaAnswer = new Promise<Response>((resolve) => {
        releaseAlpha = resolve;
      });
      const omegaBeads = [
        bead("o-1", { title: "Omega in o-m", milestone: "o-m" }),
        bead("o-2", { title: "Omega in a-m", milestone: "a-m" }),
      ];
      const answer = (current: string) => ({
        milestones: [option("a-m", "active"), option("o-m", "active")],
        current,
      });
      stub(
        () => json(omegaBeads),
        defaultProjects,
        (url) =>
          url.searchParams.get("project") === "alpha" ? alphaAnswer : Promise.resolve(json(answer("o-m"))),
      );
      render(<BeadsPage />);
      await screen.findByLabelText("Milestone");
      act(() => navigate("/beads?project=omega"));
      await screen.findByText("Omega in o-m");
      expect(screen.queryByText("Omega in a-m")).toBeNull();
      await act(async () => {
        releaseAlpha(json(answer("a-m")));
        await alphaAnswer;
      });
      expect(screen.getByText("Omega in o-m")).toBeInTheDocument();
      expect(screen.queryByText("Omega in a-m")).toBeNull();
      expect(screen.getByLabelText("Milestone")).toHaveValue("o-m");
    });

    it("REQ-UI-104 an unknown milestone id shows All", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&milestone=bogus");
      withMilestones("m2");
      render(<BeadsPage />);
      await screen.findByText("Epic loose");
      expect(screen.getByLabelText("Milestone")).toHaveValue("all");
      expect(screen.getByText("Epic three")).toBeInTheDocument();
      expect(screen.getByText("Epic two")).toBeInTheDocument();
      expect(screen.queryByText("Milestone bead")).toBeNull();
    });

    it("REQ-UI-104 the mobile sheet offers the Milestone select", async () => {
      withMilestones("m2");
      render(<BeadsPage />);
      await screen.findByText("Epic two");
      expect(screen.getAllByLabelText("Milestone")).toHaveLength(1);
      await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByLabelText("Milestone")).toHaveValue("m2");
    });
  });

  describe("kind and capability filters", () => {
    const stubKinds = () =>
      stub(() =>
        json([
          bead("e-1", { title: "Tech epic", issue_type: "epic", kind: "technical", capabilities: ["ui"] }),
          bead("t-1", { title: "Tech track", parent: "e-1" }),
          bead("e-2", { title: "Cap epic", issue_type: "epic", kind: "capability", capabilities: ["beads"] }),
          bead("t-2", { title: "Cap track", parent: "e-2" }),
        ]),
      );

    it("REQ-UI-108 the Kind select sets kind and keeps the epics of that kind", async () => {
      stubKinds();
      render(<BeadsPage />);
      await screen.findAllByText("Cap epic");
      await userEvent.selectOptions(screen.getByLabelText("Kind"), "technical");
      expect(window.location.search).toContain("kind=technical");
      expect(await screen.findByText("Tech track")).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText("Cap epic")).toBeNull());
      expect(screen.queryByText("Cap track")).toBeNull();
    });

    it("REQ-UI-108 the Capability multi-select lists the capabilities and sets capability", async () => {
      stubKinds();
      render(<BeadsPage />);
      await screen.findAllByText("Cap epic");
      await userEvent.click(screen.getByRole("button", { name: "Capability" }));
      expect(await screen.findByRole("checkbox", { name: "ui" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("checkbox", { name: "beads" }));
      expect(window.location.search).toContain("capability=beads");
      expect(await screen.findByText("Cap track")).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText("Tech epic")).toBeNull());
      expect(screen.queryByText("Tech track")).toBeNull();
    });

    it("REQ-UI-108 Clear filters clears kind and capability", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&kind=technical&capability=ui");
      stubKinds();
      render(<BeadsPage />);
      await screen.findAllByText("Tech epic");
      await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(window.location.search).not.toContain("kind");
      expect(window.location.search).not.toContain("capability");
      expect((await screen.findAllByText("Cap epic")).length).toBeGreaterThan(0);
    });

    it("REQ-UI-108 with no capabilities there is no Capability filter", async () => {
      stub(() => json([bead("a-1")]));
      render(<BeadsPage />);
      await screen.findByText("Title a-1");
      expect(screen.queryByRole("button", { name: "Capability" })).toBeNull();
      expect(screen.getByLabelText("Kind")).toBeInTheDocument();
    });

    it("REQ-UI-108 the mobile sheet sets kind and capability", async () => {
      stubKinds();
      render(<BeadsPage />);
      await screen.findAllByText("Cap epic");
      await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(within(within(dialog).getByRole("group", { name: "Kind" })).getByRole("button", { name: "Technical" }));
      expect(window.location.search).toContain("kind=technical");
      await userEvent.click(within(within(dialog).getByRole("group", { name: "Capability" })).getByRole("button", { name: "ui" }));
      expect(window.location.search).toContain("capability=ui");
    });
  });
});
