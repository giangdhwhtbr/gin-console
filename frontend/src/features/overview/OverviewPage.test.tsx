import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HintProvider } from "@/components/HintProvider";
import { entry, list } from "@/features/milestones/milestoneFixtures";
import type { EpicWorkflow } from "@/features/projects/api";
import { statusKpis, statusReport } from "@/features/reports/status/statusFixtures";
import { DEFINITIONS } from "@/lib/definitions";
import type { AgingBead, BlockedBead, ProjectOverview } from "./api";
import { OverviewPage } from "./OverviewPage";

type Reply = Response | Promise<Response>;
type Backend = {
  projects: ProjectOverview[];
  aging_days: number;
  overview: (() => Reply) | null;
  status: (project: string, id: string) => Reply;
  milestones: (project: string) => Reply;
  workflow: (project: string, epic: string) => Reply;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const pending = () => new Promise<Response>(() => undefined);

const project = (name: string, over: Partial<ProjectOverview> = {}): ProjectOverview => ({
  name,
  error: null,
  stale: false,
  milestone: null,
  blocked: [],
  aging: [],
  unassigned: [],
  in_progress: [],
  epics: [],
  ...over,
});
const aging = (id: string, days = 4, assignee: string | null = null): AgingBead => ({ id, title: `Title ${id}`, assignee, days });
const blocked = (id: string, over: Partial<BlockedBead> = {}): BlockedBead => ({ ...aging(id), blocker: null, ...over });
const named = (id: string) => ({ id, title: `Title ${id}` });
const active = (id: string, assignee: string | null) => ({ ...named(id), assignee });
const workflow = (gates: Record<string, string> = {}, review_waivers: EpicWorkflow["review_waivers"] = []): EpicWorkflow => ({ stage: "execute", gates, warnings: [], review_waivers });

/** An on-track report of the open milestone `id` ending 2 Dec 2026, on 23 Nov. */
const onTrack = (id: string) =>
  statusReport({
    milestone: id,
    milestones: [{ id, title: `Title ${id}`, status: "active", start: "2026-11-11", end: "2026-12-02", closed_on: null }],
    kpis: statusKpis({ beads: { done: 10, scope: 14, done_week_ago: 7, scope_week_ago: 14 }, blocked: { count: 0, oldest_days: null } }),
  });

/** Answers the page's requests by URL; change the returned object between requests. `calls` holds every URL asked. */
function stub(over: Partial<Backend> = {}) {
  const calls: string[] = [];
  const backend: Backend = {
    projects: [],
    aging_days: 3,
    overview: null,
    status: (_, id) => json(onTrack(id)),
    milestones: () => json(list([])),
    workflow: () => json(workflow()),
    ...over,
  };
  vi.stubGlobal("fetch", (input: string) => {
    calls.push(input);
    const url = new URL(input, "http://localhost");
    const asked = url.searchParams.get("project") ?? "";
    if (url.pathname === "/api/overview")
      return Promise.resolve(backend.overview?.() ?? json({ generated_at: "2026-11-23T12:00:00Z", aging_days: backend.aging_days, projects: backend.projects }));
    if (url.pathname === "/api/reports/status") return Promise.resolve(backend.status(asked, url.searchParams.get("milestone") ?? ""));
    if (url.pathname === "/api/milestones") return Promise.resolve(backend.milestones(asked));
    const [, name, epic] = /^\/api\/beads\/([^/]+)\/([^/]+)\/workflow$/.exec(url.pathname) ?? [];
    return Promise.resolve(backend.workflow(name ?? "", epic ?? ""));
  });
  return { backend, calls };
}

const page = () =>
  render(
    <HintProvider>
      <OverviewPage />
    </HintProvider>,
  );

const tick = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
const section = (heading: string) => screen.getByRole("heading", { name: heading }).closest("section") ?? document.body;
const rowsIn = (heading: string) => within(section(heading)).queryAllByRole("listitem");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("OverviewPage loading and errors", () => {
  it("REQ-OVERVIEW-010 a project error is one alert and the other project's lists are shown", async () => {
    stub({ projects: [project("a", { error: "issues.jsonl is missing" }), project("b", { blocked: [blocked("t-3")] })] });
    page();
    expect(await screen.findByText("a could not be loaded")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("issues.jsonl is missing");
    expect(screen.getByRole("link", { name: /t-3/ })).toHaveAttribute("href", "/beads/b/t-3");
    expect(rowsIn("Milestones")).toHaveLength(1);
    expect(rowsIn("Milestones")[0]).toHaveTextContent(/^b/);
  });

  it("REQ-OVERVIEW-010 a poll asks only the overview when it names the same epics and milestones", async () => {
    vi.useFakeTimers();
    const { calls } = stub({ projects: [project("a", { milestone: named("m1"), epics: [named("e-1")] })] });
    page();
    await tick();
    expect(calls.slice().sort()).toEqual(["/api/beads/a/e-1/workflow", "/api/milestones?project=a", "/api/overview", "/api/reports/status?project=a&milestone=m1"]);
    calls.length = 0;
    await tick(10_000);
    expect(calls).toEqual(["/api/overview"]);
  });

  it("REQ-OVERVIEW-010 a poll asks only for the epic and the milestone the overview did not name before", async () => {
    vi.useFakeTimers();
    const { backend, calls } = stub({ projects: [project("a", { milestone: named("m1"), epics: [named("e-1")] })] });
    backend.milestones = () => json(list([entry("m1", { finish: "2027-01-20" })]));
    page();
    await tick();
    expect(rowsIn("Milestones")[0]).toHaveTextContent("Late");
    calls.length = 0;
    backend.projects = [project("a", { milestone: named("m2"), epics: [named("e-1"), named("e-2")] })];
    backend.status = pending;
    await tick(10_000);
    expect(calls.slice().sort()).toEqual(["/api/beads/a/e-2/workflow", "/api/overview", "/api/reports/status?project=a&milestone=m2"]);
    expect(rowsIn("Milestones")[0]).toHaveTextContent("Title m2");
    expect(rowsIn("Milestones")[0]).toHaveTextContent("Loading status…");
    expect(rowsIn("Milestones")[0]).not.toHaveTextContent("Late");
  });

  it("REQ-OVERVIEW-010 a new milestone asks the forecast again instead of using the old list", async () => {
    vi.useFakeTimers();
    const { backend } = stub({ projects: [project("a", { milestone: named("m1") })], milestones: () => json(list([entry("m1", { finish: "2026-11-30" })])) });
    page();
    await tick();
    backend.projects = [project("a", { milestone: named("m2") })];
    backend.milestones = () => json(list([entry("m2", { finish: "2027-01-20" })]));
    await tick(10_000);
    expect(rowsIn("Milestones")[0]).toHaveTextContent("Late");
  });

  it("REQ-OVERVIEW-010 an epic that left the overview leaves the lists and is not asked again when it returns", async () => {
    vi.useFakeTimers();
    const { backend, calls } = stub({ projects: [project("a", { epics: [named("e-1")] })], workflow: () => json(workflow({ plan_approved: "unmet" })) });
    page();
    await tick();
    expect(rowsIn("Gates not met (1)")).toHaveLength(1);
    backend.projects = [project("a")];
    await tick(10_000);
    expect(rowsIn("Gates not met (0)")).toHaveLength(0);
    calls.length = 0;
    backend.projects = [project("a", { epics: [named("e-1")] })];
    await tick(10_000);
    expect(rowsIn("Gates not met (1)")).toHaveLength(1);
    expect(calls).toEqual(["/api/overview"]);
  });

  it("REQ-OVERVIEW-010 a later failure keeps the lists and adds an alert with the error", async () => {
    vi.useFakeTimers();
    const { backend } = stub({ projects: [project("a", { blocked: [blocked("t-3")] })] });
    page();
    await tick();
    expect(screen.queryByRole("alert")).toBeNull();
    backend.overview = () => json({}, 502);
    await tick(10_000);
    expect(screen.getByRole("alert")).toHaveTextContent("HTTP 502");
    expect(screen.getByRole("link", { name: /t-3/ })).toBeInTheDocument();
    backend.overview = null;
    await tick(10_000);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("REQ-OVERVIEW-010 Retry after a failed first load only loads the overview again", async () => {
    const { backend, calls } = stub({ overview: () => json({}, 502) });
    page();
    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByRole("alert")).toHaveTextContent("HTTP 502");
    backend.overview = null;
    calls.length = 0;
    await userEvent.setup().click(retry);
    expect(await screen.findByText("No projects configured.")).toBeInTheDocument();
    expect(calls).toEqual(["/api/overview"]);
  });

  it("REQ-OVERVIEW-010 notes each stale project once", async () => {
    stub({ projects: [project("a", { stale: true }), project("b"), project("c", { stale: true })] });
    page();
    expect((await screen.findAllByText(/may be out of date/)).map((n) => n.textContent)).toEqual([
      "Beads of a may be out of date. Run bd export -o .beads/issues.jsonl in a.",
      "Beads of c may be out of date. Run bd export -o .beads/issues.jsonl in c.",
    ]);
  });

  it("REQ-OVERVIEW-010 says when no project is configured", async () => {
    stub();
    page();
    expect(await screen.findByText("No projects configured.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Needs attention" })).toBeNull();
  });
});

describe("OverviewPage milestones", () => {
  const withM1 = [project("a", { milestone: named("m1") })];

  it("REQ-OVERVIEW-007 shows the verdict with Checking forecast, then the word the forecast makes", async () => {
    let answer: (response: Response) => void = () => undefined;
    stub({ projects: withM1, milestones: () => new Promise((resolve) => { answer = resolve; }) });
    page();
    expect(await screen.findByText("Checking forecast")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Title m1" })).toHaveAttribute("href", "/milestones/a/m1");
    answer(json(list([entry("m1", { finish: "2027-01-20" })])));
    expect(await screen.findByText("Late")).toBeInTheDocument();
    expect(screen.queryByText("Checking forecast")).toBeNull();
    expect(screen.queryByText("On track")).toBeNull();
  });

  it("REQ-OVERVIEW-007 keeps the verdict when the forecast fails", async () => {
    stub({ projects: withM1, milestones: () => json({ error: "gin failed" }, 502) });
    page();
    expect(await screen.findByText("Forecast not loaded")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.queryByText("Checking forecast")).toBeNull();
  });

  it("REQ-OVERVIEW-007 reads No open milestone and asks no status for that project", async () => {
    const { calls } = stub({ projects: [project("b")] });
    page();
    expect(await screen.findByText("No open milestone")).toBeInTheDocument();
    expect(calls).toEqual(["/api/overview"]);
  });

  it("REQ-OVERVIEW-007 a failed status shows its error on its line and the other lines as usual", async () => {
    stub({
      projects: [...withM1, project("b", { milestone: named("m2") })],
      status: (name, id) => (name === "a" ? json({ error: "bad export" }, 502) : json(onTrack(id))),
    });
    page();
    expect(await screen.findByText("bad export")).toBeInTheDocument();
    expect(await screen.findByText("On track")).toBeInTheDocument();
    const [a, b] = rowsIn("Milestones");
    expect(a).toHaveTextContent("bad export");
    expect(a).not.toHaveTextContent("Checking forecast");
    expect(b).toHaveTextContent("On track");
  });

  it("REQ-MILESTONE-UI-023 a milestone past its end is late without a forecast, and behind pace alone is not", async () => {
    const past = onTrack("m1");
    const slow = onTrack("m2");
    stub({
      projects: [...withM1, project("b", { milestone: named("m2") })],
      status: (name) =>
        json(
          name === "a"
            ? { ...past, milestones: past.milestones.map((m) => ({ ...m, end: "2026-11-20" })) }
            : { ...slow, kpis: { ...slow.kpis, pace: { pace: 2.0, pace_needed: 3.4, pace_week_ago: null } } },
        ),
    });
    page();
    expect(await screen.findByText("Late")).toBeInTheDocument();
    const [a, b] = rowsIn("Milestones");
    expect(a).toHaveTextContent("Late");
    expect(b).not.toHaveTextContent(/late/i);
  });
});

describe("OverviewPage gates", () => {
  const epics = (...ids: string[]) => [project("a", { epics: ids.map(named) })];

  it("REQ-OVERVIEW-008 lists an epic started before its plan and not one with only late gates unmet", async () => {
    stub({
      projects: epics("e-1", "e-2"),
      workflow: (_, id) => json(workflow(id === "e-1" ? { requirement_confirmed: "met", plan_approved: "unmet" } : { implementation_complete: "unmet", shipped: "unmet" })),
    });
    page();
    await screen.findByRole("heading", { name: "Gates not met (1)" });
    const [row, ...rest] = rowsIn("Gates not met (1)");
    expect(rest).toEqual([]);
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/beads/a/e-1");
    expect(row).toHaveTextContent("plan_approved");
    expect(within(row).getByText("a")).toBeInTheDocument();
  });

  it("REQ-OVERVIEW-008 lists waived gates and review waivers with their reason, project and bead", async () => {
    stub({
      projects: epics("e-1"),
      workflow: () => json(workflow({ plan_approved: "waived(hotfix)" }, [{ task_id: "e-1.2", reason: "no reviewer", actor: "x" }])),
    });
    page();
    await screen.findByRole("heading", { name: "Waivers (2)" });
    const [gate, review] = rowsIn("Waivers (2)");
    expect(gate).toHaveTextContent(/plan_approved.*hotfix/);
    expect(within(gate).getByRole("link")).toHaveAttribute("href", "/beads/a/e-1");
    expect(within(gate).getByText("a")).toBeInTheDocument();
    expect(review).toHaveTextContent(/e-1\.2.*no reviewer/);
    expect(within(review).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/beads/a/e-1", "/beads/a/e-1.2"]);
    expect(within(review).getByText("a")).toBeInTheDocument();
  });

  it("REQ-OVERVIEW-008 both sections read Checking 5 of 14 and no count, at most 4 requests open", async () => {
    let asked = 0;
    stub({
      projects: epics(...Array.from({ length: 14 }, (_, i) => `e-${i}`)),
      workflow: () => {
        asked += 1;
        return asked <= 5 ? json(workflow({ plan_approved: "unmet" })) : pending();
      },
    });
    page();
    await waitFor(() => expect(screen.getAllByText("Checking 5 of 14")).toHaveLength(2));
    expect(within(section("Gates not met")).getByText("Checking 5 of 14")).toBeInTheDocument();
    expect(within(section("Waivers")).getByText("Checking 5 of 14")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^(Gates not met|Waivers) \(/ })).toBeNull();
    expect(within(section("Waivers")).queryByText("None")).toBeNull();
    expect(rowsIn("Gates not met")).toHaveLength(5);
    expect(asked).toBe(9);
  });

  it("REQ-OVERVIEW-008 a failed epic is the uncounted line Could not read gates with the epic and the error", async () => {
    stub({
      projects: epics("e-1", "e-3"),
      workflow: (_, id) => (id === "e-3" ? json({ error: "gin timed out" }, 502) : json(workflow({ plan_approved: "unmet" }))),
    });
    page();
    await screen.findByRole("heading", { name: "Gates not met (1)" });
    const line = within(section("Gates not met (1)")).getByText(/Could not read gates/);
    expect(line).toHaveTextContent(/Could not read gates.*e-3.*gin timed out/);
    expect(within(line).getByRole("link")).toHaveAttribute("href", "/beads/a/e-3");
    expect(rowsIn("Gates not met (1)")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Waivers (0)" })).toBeInTheDocument();
  });

  it("REQ-OVERVIEW-008 does not read None when the gates of its only epic could not be read", async () => {
    stub({ projects: epics("e-3"), workflow: () => json({ error: "gin timed out" }, 502) });
    page();
    await screen.findByRole("heading", { name: "Gates not met (0)" });
    expect(within(section("Gates not met (0)")).queryByText("None")).toBeNull();
  });

  it("REQ-OVERVIEW-008 a malformed workflow answer is a failed request", async () => {
    stub({ projects: epics("e-1"), workflow: () => json({ gates: null }) });
    page();
    expect(await screen.findByText(/Could not read gates/)).toHaveTextContent("unexpected response");
  });

  it("REQ-OVERVIEW-008 at most 4 workflow requests are open at any time", async () => {
    let open = 0;
    let peak = 0;
    stub({
      projects: epics(...Array.from({ length: 14 }, (_, i) => `e-${i}`)),
      workflow: async () => {
        open += 1;
        peak = Math.max(peak, open);
        await new Promise((resolve) => setTimeout(resolve, 1));
        open -= 1;
        return json(workflow());
      },
    });
    page();
    expect(await screen.findByRole("heading", { name: "Gates not met (0)" })).toBeInTheDocument();
    expect(peak).toBe(4);
  });
});

describe("OverviewPage needs attention", () => {
  it("REQ-OVERVIEW-009 shows the five sections in order", async () => {
    stub({ projects: [project("a")] });
    page();
    await screen.findByRole("heading", { name: "Needs attention" });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Blocked (0)",
      "In progress > 3 days (0)",
      "Gates not met (0)",
      "Waivers (0)",
      "Unassigned ready (0)",
    ]);
  });

  it("REQ-OVERVIEW-009 shows the 10 that waited longest of 12, and Show all the rest", async () => {
    const beads = Array.from({ length: 12 }, (_, i) => ({ ...blocked(`t-${i + 1}`), days: i + 1 }));
    stub({ projects: ["a", "b", "c"].map((name, n) => project(name, { blocked: beads.filter((_, i) => i % 3 === n).reverse() })) });
    page();
    await screen.findByRole("heading", { name: "Blocked (12)" });
    const ids = () => rowsIn("Blocked (12)").map((row) => row.dataset.id);
    expect(ids()).toEqual(["t-12", "t-11", "t-10", "t-9", "t-8", "t-7", "t-6", "t-5", "t-4", "t-3"]);
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(ids().slice(10)).toEqual(["t-2", "t-1"]);
    expect(screen.queryByRole("button", { name: "Show all" })).toBeNull();
  });

  it("REQ-OVERVIEW-009 an empty section reads None", async () => {
    stub({ projects: [project("a", { epics: [named("e-1")] })] });
    page();
    await screen.findByRole("heading", { name: "Waivers (0)" });
    expect(within(section("Waivers (0)")).getByText("None")).toBeInTheDocument();
  });

  it("REQ-OVERVIEW-009 a Blocked row shows project, assignee, wait and its blocker as a link with the person", async () => {
    stub({ projects: [project("a", { blocked: [{ ...aging("t-3", 4, "ann@example.com"), blocker: { ...named("t-8"), person: "bao", blocked: false } }, blocked("t-4")] })] });
    page();
    await screen.findByRole("heading", { name: "Blocked (2)" });
    const [row, alone] = rowsIn("Blocked (2)");
    expect(within(row).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/beads/a/t-3", "/beads/a/t-8"]);
    for (const text of ["a", "ann", "waits 4 d", "bao"]) expect(within(row).getByText(text)).toBeInTheDocument();
    expect(within(alone).getAllByRole("link")).toHaveLength(1);
    expect(within(alone).getByText("Unassigned")).toBeInTheDocument();
  });

  it("REQ-OVERVIEW-009 aging rows show the assignee and days, unassigned rows the priority", async () => {
    stub({
      projects: [project("a", { aging: [aging("t-1", 5, "ann")], unassigned: [{ ...named("t-2"), priority: 0 }, { ...named("t-5"), priority: null }] })],
    });
    page();
    await screen.findByRole("heading", { name: "In progress > 3 days (1)" });
    const [old] = rowsIn("In progress > 3 days (1)");
    for (const text of ["a", "ann", "5 d"]) expect(within(old).getByText(text)).toBeInTheDocument();
    const [ready, none] = rowsIn("Unassigned ready (2)");
    expect(within(ready).getByText("P0")).toBeInTheDocument();
    expect(none).not.toHaveTextContent(/P\d|null/);
  });

  it("REQ-OVERVIEW-009 keyboard focus on the aging heading explains its rule", async () => {
    stub({ projects: [project("a")] });
    page();
    const mark = await screen.findByText("In progress > 3 days (0)");
    expect(mark).toHaveAttribute("tabindex", "0");
    act(() => mark.focus());
    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent(/beads in progress/);
    expect(tip).toHaveTextContent(/working days/);
    expect(tip).toHaveTextContent(/Blocked beads are listed under Blocked/);
  });

  it.each([
    ["Milestones", DEFINITIONS.overviewMilestones],
    ["Blocked (0)", DEFINITIONS.blocked],
    ["Gates not met (0)", DEFINITIONS.overviewGates],
    ["Waivers (0)", DEFINITIONS.overviewWaivers],
    ["Unassigned ready (0)", DEFINITIONS.overviewUnassigned],
    ["Work in progress", DEFINITIONS.overviewWorkload],
  ])("REQ-OVERVIEW-009 the heading %s explains its rule on keyboard focus", async (heading, rule) => {
    stub({ projects: [project("a")] });
    page();
    const mark = within(await screen.findByRole("heading", { name: heading })).getByText(heading);
    const user = userEvent.setup();
    for (let i = 0; i < 12 && document.activeElement !== mark; i += 1) await user.tab();
    expect(mark).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(rule);
  });

  it("REQ-OVERVIEW-009 holds no control that changes a project or a bead", async () => {
    stub({ projects: [project("a", { blocked: Array.from({ length: 11 }, (_, i) => blocked(`t-${i}`)) })] });
    page();
    await screen.findByRole("heading", { name: "Blocked (11)" });
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Show all"]);
    for (const role of ["textbox", "checkbox", "combobox"]) expect(screen.queryByRole(role)).toBeNull();
  });
});

describe("OverviewPage workload", () => {
  it("REQ-OVERVIEW-005 one person in two projects is one row with the total, the number per project and the beads", async () => {
    stub({
      projects: [project("a", { in_progress: [active("a-1", "ann")] }), project("b", { in_progress: [active("b-1", "ann@example.com"), active("b-2", "ann@example.com")] })],
    });
    page();
    const [row] = await waitFor(() => {
      const people = screen.getAllByRole("listitem").filter((li) => li.dataset.person !== undefined);
      expect(people).toHaveLength(1);
      return people;
    });
    for (const text of ["ann", "3", "1 in a", "2 in b"]) expect(within(row).getByText(text)).toBeInTheDocument();
    expect(Array.from(row.querySelectorAll("a"), (a) => a.getAttribute("href"))).toEqual(["/beads/a/a-1", "/beads/b/b-1", "/beads/b/b-2"]);
  });

  it("REQ-OVERVIEW-005 Unassigned is last", async () => {
    stub({ projects: [project("a", { in_progress: [...[1, 2, 3, 4].map((n) => active(`a-${n}`, null)), active("a-5", "ann")] })] });
    page();
    await screen.findByRole("heading", { name: "Work in progress" });
    expect(screen.getAllByRole("listitem").flatMap((li) => li.dataset.person ?? [])).toEqual(["ann", "Unassigned"]);
  });

  it("REQ-OVERVIEW-005 reads None without work in progress", async () => {
    stub({ projects: [project("a")] });
    page();
    await screen.findByRole("heading", { name: "Work in progress" });
    expect(within(section("Work in progress")).getByText("None")).toBeInTheDocument();
  });
});
