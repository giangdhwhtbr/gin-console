import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Beads, Project, Workflow, WorkspaceRepo } from "./api";
import { ProjectsPage } from "./ProjectsPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const project = (overrides: Partial<Project> = {}): Project => ({
  name: "qwikfone",
  path: "/home/gin/qwikfone",
  exists: true,
  workflow: null,
  beads: null,
  ...overrides,
});

const workflow: Workflow = {
  stage: "plan",
  layout: "sdd",
  gates: { requirement_confirmed: "satisfied", plan_approved: "unmet" },
};

const repo = (path: string, extra: Partial<WorkspaceRepo> = {}): WorkspaceRepo => ({
  path,
  branch: "master",
  shape: "backend",
  frozen: false,
  present: true,
  ...extra,
});
const workspaceOf = (n: number, frozen = -1) => ({
  root: "/w",
  repos: Array.from({ length: n }, (_, i) => repo(`repo-${i}`, { frozen: i === frozen })),
});
const teamWorkflow: Workflow = { ...workflow, team: { enabled: true, host: "github", me: null } };

const beads: Beads = {
  open: 3,
  in_progress: 1,
  blocked: 0,
  ready: 2,
  epics: [{ id: "e1", title: "Epic one" }],
};

const cardOf = (name: string) => screen.getByRole("article", { name });

afterEach(() => {
  cleanup(); // vitest runs without globals, so Testing Library does not clean up by itself
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProjectsPage", () => {
  // REQ-UI-001
  it("REQ-UI-001 lists projects and marks missing ones", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json([project(), project({ name: "old", path: "/home/gin/old", exists: false })]),
        ),
    );
    render(<ProjectsPage />);
    await screen.findByRole("article", { name: "qwikfone" });
    expect(within(cardOf("qwikfone")).getByText("/home/gin/qwikfone")).toBeInTheDocument();
    expect(within(cardOf("qwikfone")).queryByText("missing")).not.toBeInTheDocument();
    expect(within(cardOf("old")).getByText("missing")).toBeInTheDocument();
  });

  // REQ-UI-001
  it("REQ-UI-001 shows an empty state naming the config file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));
    render(<ProjectsPage />);
    expect(await screen.findByText(/no projects configured/i)).toBeInTheDocument();
    expect(screen.getByText(/~\/\.config\/gin-console\/config\.yaml/)).toBeInTheDocument();
  });

  // REQ-UI-002
  it("REQ-UI-002 shows an error and retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ detail: "boom" }, 500))
      .mockResolvedValueOnce(json([project({ name: "scotty" })]));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProjectsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("article", { name: "scotty" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // REQ-UI-003
  it("REQ-UI-003 shows workspace and team, and lists the repos on request", async () => {
    const full: Workflow = { ...teamWorkflow, workspace: workspaceOf(8, 2) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ workflow: full })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).getByText("workspace · 8 repos")).toBeInTheDocument();
    expect(within(card).getByText("team · github")).toBeInTheDocument();
    expect(within(card).queryByText("repo-0")).not.toBeInTheDocument();
    const toggle = within(card).getByRole("button", { name: "Show repos" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(card).getAllByText(/^repo-\d$/)).toHaveLength(8);
    expect(within(card).getAllByText("frozen")).toHaveLength(1);
    expect(within(card).queryByText("missing")).not.toBeInTheDocument();
  });

  // REQ-UI-003
  it("REQ-UI-003 marks a repo that is not present", async () => {
    const w: Workflow = { ...workflow, workspace: { root: "/w", repos: [repo("gone", { present: false })] } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ workflow: w })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    await userEvent.click(within(card).getByRole("button", { name: "Show repos" }));
    expect(within(card).getByText("missing")).toBeInTheDocument();
  });

  // REQ-UI-003
  it("REQ-UI-003 shows a health alert and the review waivers", async () => {
    const held: Workflow = {
      ...workflow,
      decision: "hold",
      warnings: ["event log unreadable"],
      remedies: ["run gin doctor"],
      review_waivers: [{ task_id: "t-1", reason: "docs only", actor: "gin" }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ workflow: held })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    const alert = within(card).getByRole("alert");
    expect(alert).toHaveTextContent("hold");
    expect(alert).toHaveTextContent("event log unreadable");
    expect(alert).toHaveTextContent("run gin doctor");
    expect(within(card).getByText("1 review waiver")).toBeInTheDocument();
    expect(within(card).getByText(/t-1/)).toBeInTheDocument();
  });

  // REQ-UI-003
  it("REQ-UI-003 shows nothing for a plain project and no gate chips", async () => {
    const plain: Workflow = { ...workflow, stage: "discuss", team: { enabled: false, host: null, me: null } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ workflow: plain })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(within(card).queryByText(/workspace|team|waiver|discuss|: (satisfied|unmet)/)).not.toBeInTheDocument();
  });

  // REQ-UI-004
  it("REQ-UI-004 shows the Beads counts and the active epics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    for (const text of ["open 3", "in progress 1", "blocked 0", "ready 2"]) {
      expect(within(card).getByText(text)).toBeInTheDocument();
    }
    expect(within(card).getByText("e1")).toBeInTheDocument();
    expect(within(card).getByText(/Epic one/)).toBeInTheDocument();
  });

  it("REQ-UI-004 Blocked work stands out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads: { ...beads, blocked: 19 } }), project({ name: "other", beads })])));
    render(<ProjectsPage />);
    const first = within(await screen.findByRole("article", { name: "qwikfone" })).getByText("blocked 19");
    expect(first).toHaveClass("text-state-blocked");
    expect(first.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const second = within(screen.getByRole("article", { name: "other" })).getByText("blocked 0");
    expect(second).not.toHaveClass("text-state-blocked");
    expect(second.querySelector("svg")).toBeNull();
  });

  it("REQ-UI-004 shows prep <n> only when prep tasks exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads: { ...beads, prep: 2 } }), project({ name: "other", beads })])));
    render(<ProjectsPage />);
    expect(within(await screen.findByRole("article", { name: "qwikfone" })).getByText("prep 2")).toBeInTheDocument();
    expect(within(cardOf("other")).queryByText(/^prep/)).toBeNull();
  });

  // REQ-UI-004
  it("REQ-UI-004 shows the stage per epic, a warning mark with details, and ready", async () => {
    const epics: Beads["epics"] = [
      {
        id: "e-1",
        title: "Running",
        status: "in_progress",
        workflow: {
          stage: "execute",
          gates: {},
          warnings: [],
          review_waivers: [{ task_id: "t-9", reason: "docs only", actor: "gin" }],
        },
      },
      { id: "e-2", title: "Waiting", status: "open" },
      { id: "e-3", title: "Broken", status: "in_progress", workflow: { error: "gin failed" } },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads: { ...beads, epics } })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    const [running, waiting, broken] = within(card).getAllByRole("listitem");
    expect(within(running).getByText("execute")).toBeInTheDocument();
    expect(within(running).getByText("⚠ 1")).toBeInTheDocument();
    expect(within(running).getByText(/t-9.*docs only/)).toHaveClass("sr-only");
    expect(within(waiting).getByText("ready")).toBeInTheDocument();
    expect(within(waiting).queryByText(/⚠/)).not.toBeInTheDocument();
    expect(within(broken).getByText("stage unknown")).toHaveAttribute("title", "gin failed");
  });

  // REQ-UI-004
  it("REQ-UI-004 does not crash on a partial, null or malformed epic workflow", async () => {
    const bad = (value: unknown) => value as Beads["epics"][number]["workflow"];
    const epics: Beads["epics"] = [
      { id: "p-1", title: "Partial", status: "in_progress", workflow: bad({ stage: "plan", gates: {} }) },
      { id: "p-2", title: "Null", status: "in_progress", workflow: null },
      { id: "p-3", title: "Bad", status: "in_progress", workflow: bad({ stage: "ship", warnings: "x", review_waivers: 3 }) },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads: { ...beads, epics } })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    const [partial, nul, malformed] = within(card).getAllByRole("listitem");
    expect(within(partial).getByText("plan")).toBeInTheDocument();
    expect(within(partial).queryByText(/⚠/)).not.toBeInTheDocument();
    expect(within(nul).queryByText(/plan|⚠|unknown/)).not.toBeInTheDocument();
    expect(within(malformed).getByText("ship")).toBeInTheDocument();
    expect(within(malformed).queryByText(/⚠/)).not.toBeInTheDocument();
  });

  // REQ-UI-003
  it("REQ-UI-003 does not crash on a workspace without repos or non-array warnings", async () => {
    const bad = (value: unknown) => value as Workflow;
    const cases = [
      bad({ ...workflow, workspace: { root: "/w" } }),
      bad({ ...workflow, warnings: "x", remedies: 1, review_waivers: "y" }),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json([project({ workflow: cases[0] }), project({ name: "other", workflow: cases[1] })]),
      ),
    );
    render(<ProjectsPage />);
    await screen.findByRole("article", { name: "qwikfone" });
    expect(within(cardOf("qwikfone")).getByText("workspace · 0 repos")).toBeInTheDocument();
    expect(within(cardOf("other")).queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-004
  it("REQ-UI-004 says when there are no active epics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json([project({ beads: { ...beads, epics: [] } })])),
    );
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).getByText(/no active epics/i)).toBeInTheDocument();
  });

  // REQ-UI-005
  it("REQ-UI-005 links the project name to its beads page and each epic to the bead page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ name: "scotty", beads })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "scotty" });
    const projectLink = within(card).getByRole("link", { name: "scotty" });
    expect(projectLink).toHaveAttribute("href", "/beads?project=scotty");
    expect(projectLink).not.toHaveAttribute("target");
    const epicLink = within(card).getByRole("link", { name: "e1" });
    expect(epicLink).toHaveAttribute("href", "/beads/scotty/e1");
  });

  // REQ-UI-005
  it("REQ-UI-005 encodes the project name in the project link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ name: "a b" })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "a b" });
    expect(within(card).getByRole("link", { name: "a b" })).toHaveAttribute(
      "href",
      "/beads?project=a%20b",
    );
  });

  // REQ-UI-005
  it("REQ-UI-005 encodes project name and epic id in the epic link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json([
          project({
            name: "my proj",
            beads: { ...beads, epics: [{ id: "e/1", title: "Slash epic" }] },
          }),
        ]),
      ),
    );
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "my proj" });
    const epicLink = within(card).getByRole("link", { name: "e/1" });
    expect(epicLink).toHaveAttribute("href", "/beads/my%20proj/e%2F1");
  });

  // REQ-UI-007
  it("REQ-UI-007 shows a block error and still shows the other block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json([project({ workflow: teamWorkflow, beads: { error: "bd not found" } })])),
    );
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).getByText(/bd not found/)).toBeInTheDocument();
    expect(within(card).getByText("team · github")).toBeInTheDocument();
  });

  describe("refresh", () => {
    const visibility = (state: "visible" | "hidden") =>
      vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);

    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    // REQ-UI-006
    it("REQ-UI-006 reloads every 10 seconds without a loading state", async () => {
      vi.useFakeTimers();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json([project({ workflow: { ...workflow, workspace: workspaceOf(1) } })]))
        .mockResolvedValue(json([project({ workflow: { ...workflow, workspace: workspaceOf(2) } })]));
      vi.stubGlobal("fetch", fetchMock);
      render(<ProjectsPage />);
      await advance(0);
      expect(within(cardOf("qwikfone")).getByText("workspace · 1 repos")).toBeInTheDocument();
      await advance(10_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(within(cardOf("qwikfone")).getByText("workspace · 2 repos")).toBeInTheDocument();
    });

    // REQ-UI-006
    it("REQ-UI-006 does not poll while hidden and reloads when visible again", async () => {
      vi.useFakeTimers();
      const fetchMock = vi.fn().mockResolvedValue(json([project()]));
      vi.stubGlobal("fetch", fetchMock);
      const state = visibility("visible");
      render(<ProjectsPage />);
      await advance(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      state.mockReturnValue("hidden");
      await advance(30_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      state.mockReturnValue("visible");
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // REQ-UI-006
    it("REQ-UI-006 keeps the last data when a refresh fails and retries on demand", async () => {
      vi.useFakeTimers();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json([project()]))
        .mockResolvedValueOnce(json({ detail: "boom" }, 500))
        .mockResolvedValue(json([project({ name: "scotty" })]));
      vi.stubGlobal("fetch", fetchMock);
      render(<ProjectsPage />);
      await advance(0);
      await advance(10_000);
      expect(screen.getByRole("alert")).toHaveTextContent(/500/);
      expect(cardOf("qwikfone")).toBeInTheDocument();
      await act(async () => {
        screen.getByRole("button", { name: /retry/i }).click();
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(cardOf("scotty")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("pull line", () => {
    const load = async (projects: unknown[]) => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(projects))));
      render(<ProjectsPage />);
      await screen.findByRole("article", { name: "A" });
    };
    const pullAt = (secondsAgo: number) => new Date(Date.now() - secondsAgo * 1000).toISOString();

    it("REQ-BEADS-018 Pulled: the card shows the age of the pull", async () => {
      const at = pullAt(120);
      await load([project({ name: "A", beads, pull: { at, status: "ok", error: null } })]);
      const line = within(cardOf("A")).getByText("pulled 2 minutes ago");
      expect(line).toHaveAttribute("title", expect.stringContaining("UTC"));
    });

    it("REQ-BEADS-018 No remote: the card shows no Dolt remote and no error", async () => {
      await load([project({ name: "A", pull: { at: pullAt(5), status: "no_remote", error: null } })]);
      const card = within(cardOf("A"));
      expect(card.getByText("no Dolt remote")).not.toHaveClass("text-destructive");
      expect(card.queryByText(/pull failed/)).not.toBeInTheDocument();
    });

    it("REQ-BEADS-018 Failed pull on the card: the error shows and the counts stay", async () => {
      await load([
        project({ name: "A", beads, pull: { at: pullAt(5), status: "error", error: "Merge conflict detected" } }),
      ]);
      const card = within(cardOf("A"));
      expect(card.getByText("pull failed: Merge conflict detected")).toHaveClass("text-destructive");
      expect(card.getByText("open 3")).toBeInTheDocument();
    });

    it("REQ-BEADS-018 Older backend: no pull line, and a malformed pull does not crash the page", async () => {
      await load([
        project({ name: "A", beads }),
        project({ name: "B", pull: null }),
        project({ name: "C", pull: { at: 5, status: "weird" } as never }),
      ]);
      expect(screen.queryByText(/pulled|pull failed|no Dolt remote/)).not.toBeInTheDocument();
      expect(cardOf("C")).toBeInTheDocument();
    });
  });
});
