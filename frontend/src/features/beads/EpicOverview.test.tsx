import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MilestoneList } from "@/features/milestones/api";
import { entry, list } from "@/features/milestones/milestoneFixtures";
import type { EpicWorkflow } from "@/features/projects/api";
import type { BeadDetail, BeadSummary } from "./api";
import { bead, json } from "./beadFixtures";
import { E, E12, epic, g2, t4 } from "./epicFixtures";
import { EpicOverview } from "./EpicOverview";
import type { BeadsState } from "./useBeads";

const detail = (b: BeadSummary, over: Partial<BeadDetail> = {}): BeadDetail => ({
  ...b,
  description: null,
  design: null,
  notes: null,
  acceptance_criteria: null,
  close_reason: null,
  dependencies: [],
  dependents: [],
  children: [],
  bugs: [],
  ...over,
});

const ok = (beads: BeadSummary[]): BeadsState => ({ status: "ok", beads, error: null });
const WORKFLOW: EpicWorkflow = { stage: "execute", gates: { a: "satisfied", b: "satisfied", c: "satisfied", d: "satisfied", e: "unmet", f: "unmet" }, warnings: [], review_waivers: [] };
const MILESTONES = list([entry("ex-m2", { title: "Checkout v2", status: "active", start: "2026-11-10", end: "2026-12-01", finish: "2027-02-16" })], { today: "2026-11-20" });

/** `workflow` is the answer or a status with an error; `milestones` is the answer or a status. */
function stub(workflow: EpicWorkflow | number = WORKFLOW, milestones: MilestoneList | number = MILESTONES) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const { pathname } = new URL(text, "http://localhost");
      if (pathname.endsWith("/workflow")) return Promise.resolve(typeof workflow === "number" ? json({ error: "gin state failed: unknown workflow" }, workflow) : json(workflow));
      if (pathname === "/api/milestones") return Promise.resolve(typeof milestones === "number" ? json({ error: "x" }, milestones) : json(milestones));
      return Promise.resolve(json({}, 404));
    }),
  );
}

const show = (beads: BeadsState = ok(E12), over: Partial<BeadDetail> = {}, head = epic) =>
  render(<EpicOverview project="example" bead={detail(head, over)} beads={beads} lanesHref="/beads/example/ex-e12?tab=lanes" />);
const card = (name: string) => within(screen.getByRole("region", { name }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("EpicOverview cards", () => {
  // REQ-UI-138 Scenario: Large strand on the epic page
  it("REQ-UI-120 REQ-UI-138 Progress is a large strand of 8 beads and the words of the states, not merge gates", () => {
    stub();
    show();
    const strand = card("Progress").getByRole("img", { name: "4 done, 1 in progress, 1 blocked, 2 ready of 8 tracks" });
    expect(strand).toHaveTextContent("4 done, 1 in progress, 1 blocked, 2 ready");
    expect(strand.querySelectorAll("g[data-bead]")).toHaveLength(8);
    expect(card("Progress").queryByRole("listitem")).toBeNull();
  });

  it("REQ-UI-120 REQ-UI-130 Progress reads the child counts: the same strand with only the open children loaded", () => {
    stub();
    show(ok([epic, ...E12.filter((b) => b.parent === E && b.status !== "closed" && b.waits_for === null)]));
    expect(card("Progress").getByRole("img", { name: "4 done, 1 in progress, 1 blocked, 2 ready of 8 tracks" })).toBeInTheDocument();
  });

  it("REQ-UI-120 Points, Bugs and Prep: points of the tracks, open bugs and the prep tasks", () => {
    stub();
    const prep = bead(`${E}.11`, { parent: E, labels: ["prep"], status: "closed" });
    const head = { ...epic, child_counts: { total: 8, closed: 4, prep_total: 1, prep_closed: 1 } };
    const bugs = [
      { id: "b1", title: "x", status: "open", type: "discovered-from" as const },
      { id: "b2", title: "y", status: "closed", type: "discovered-from" as const },
    ];
    show(ok([...E12, prep]), { bugs }, head);
    const progress = card("Progress");
    expect(progress.getByText("10 of 21 pt done")).toBeInTheDocument();
    expect(progress.getByText("1 open")).toBeInTheDocument();
    expect(progress.getByText("1/1")).toBeInTheDocument();
  });

  it("REQ-UI-120 No points: the card says No points, 0 open bugs and Prep none", () => {
    stub();
    show(ok([epic, bead("k.1", { parent: E })]));
    const progress = card("Progress");
    expect(progress.getByText("No points")).toBeInTheDocument();
    expect(progress.getByText("0 open")).toBeInTheDocument();
    expect(progress.getByText("none")).toBeInTheDocument();
  });

  it("REQ-UI-120 Workflow stage: earlier stages ticked, execute marked, ship plain and Gates 4 of 6 satisfied", async () => {
    stub();
    show();
    expect(await card("Workflow").findByText("4 of 6 satisfied")).toBeInTheDocument();
    const stages = card("Workflow").getAllByRole("listitem");
    expect(stages.map((s) => s.textContent)).toEqual(["discuss", "plan", "orchestrate", "execute", "ship"]);
    expect(stages.map((s) => s.getAttribute("aria-current"))).toEqual([null, null, null, "step", null]);
    expect(stages.map((s) => s.querySelector("svg") !== null)).toEqual([true, true, true, false, false]);
    expect(card("Workflow").getAllByText("none")).toHaveLength(2);
  });

  it("REQ-UI-120 Warnings and waivers: the items show on hover and on focus, and Escape hides them", async () => {
    stub({ ...WORKFLOW, warnings: ["plan is stale", "no spec"], review_waivers: [{ task_id: "ex-e12.2", reason: "hotfix", actor: "ann" }] });
    const user = userEvent.setup();
    show();
    const warnings = await card("Workflow").findByRole("button", { name: "2" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.hover(warnings);
    expect(screen.getByRole("tooltip")).toHaveTextContent("plan is stale");
    expect(screen.getByRole("tooltip")).toHaveTextContent("no spec");
    await user.unhover(warnings);
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.tab();
    expect(screen.getByRole("button", { name: "2" })).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("plan is stale");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
    await user.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent("ex-e12.2: hotfix (ann)");
  });

  it("REQ-UI-120 Unknown workflow stage: the raw stage shows as text and no chip is marked", async () => {
    stub({ ...WORKFLOW, stage: "done" });
    show();
    expect(await card("Workflow").findByText("Stage: done")).toBeInTheDocument();
    expect(card("Workflow").getAllByRole("listitem").map((s) => s.getAttribute("aria-current"))).toEqual([null, null, null, null, null]);
  });

  it("REQ-UI-120 No workflow: an answer without a stage says No workflow", async () => {
    stub({ stage: "", gates: {}, warnings: [], review_waivers: [] });
    show();
    expect(await card("Workflow").findByText("No workflow")).toBeInTheDocument();
  });

  it("REQ-UI-120 Workflow unavailable: a 502 shows the error in the Workflow card, Progress and Milestone stay", async () => {
    stub(502);
    show();
    expect(await card("Workflow").findByText("gin state failed: unknown workflow")).toBeInTheDocument();
    expect(card("Progress").getByRole("img", { name: /of 8 tracks/ })).toBeInTheDocument();
    expect(await card("Milestone").findByRole("link", { name: "ex-m2 Checkout v2" })).toBeInTheDocument();
  });

  it("REQ-UI-120 Milestone forecast late: ex-m2 Checkout v2, 10 Nov – 1 Dec, 8 working days and a warned finish on 16 Feb 2027", async () => {
    stub();
    show();
    const milestone = card("Milestone");
    const link = await milestone.findByRole("link", { name: "ex-m2 Checkout v2" });
    expect(link).toHaveAttribute("href", "/milestones/example/ex-m2");
    expect(milestone.getByText("Active").closest("[data-status]")).toHaveAttribute("data-status", "active");
    expect(milestone.getByText("10 Nov – 1 Dec")).toBeInTheDocument();
    expect(milestone.getByText("8 working days")).toBeInTheDocument();
    const finish = milestone.getByText("finish 16 Feb 2027, after the end");
    expect(finish.parentElement?.querySelector("svg")).not.toBeNull();
    expect(finish).toBeInTheDocument();
  });

  it("REQ-UI-120 Milestone on time: no warning and no working days for a closed milestone", async () => {
    stub(WORKFLOW, list([entry("ex-m2", { title: "Checkout v2", status: "closed", start: "2026-11-10", end: "2026-12-01", finish: "2026-12-01" })], { today: "2026-11-20" }));
    show();
    const milestone = card("Milestone");
    expect(await milestone.findByText("finish 1 Dec")).toBeInTheDocument();
    expect(milestone.queryByText(/working day/)).toBeNull();
  });

  it("REQ-MILESTONE-UI-023 a closed milestone shows no late mark, whatever its forecast", async () => {
    stub(WORKFLOW, list([entry("ex-m2", { title: "Checkout v2", status: "closed", start: "2026-11-10", end: "2026-12-01", finish: "2027-02-16" })], { today: "2026-12-20" }));
    show();
    const milestone = card("Milestone");
    const finish = await milestone.findByText("finish 16 Feb 2027");
    expect(finish.parentElement?.querySelector("svg")).toBeNull();
    expect(milestone.queryByText(/after the end/)).toBeNull();
  });

  it("REQ-MILESTONE-UI-023 an active milestone is late once today is past its end", async () => {
    stub(WORKFLOW, list([entry("ex-m2", { title: "Checkout v2", status: "active", start: "2026-11-10", end: "2026-12-01", finish: "2026-12-01" })], { today: "2026-12-03" }));
    show();
    const finish = await card("Milestone").findByText(/^finish 1 Dec/);
    expect(finish.parentElement?.querySelector("svg")).not.toBeNull();
  });

  it("REQ-UI-120 No milestone: an epic without a milestone says No milestone and asks nothing", () => {
    stub();
    show(ok(E12), {}, { ...epic, milestone: null });
    expect(card("Milestone").getByText("No milestone")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([u]) => typeof u === "string" && u.includes("/api/milestones"))).toBe(false);
  });

  it("REQ-UI-120 Milestones unavailable: a failing request says so inside the card", async () => {
    stub(WORKFLOW, 500);
    show();
    expect(await card("Milestone").findByText("Milestones unavailable")).toBeInTheDocument();
    expect(card("Progress").getByRole("img", { name: /of 8 tracks/ })).toBeInTheDocument();
  });

  it("REQ-UI-120 Progress while the beads load: its own loading text, the other cards keep working", async () => {
    stub();
    show({ status: "loading" });
    expect(card("Progress").getByText("Loading progress…")).toBeInTheDocument();
    expect(await card("Workflow").findByText("4 of 6 satisfied")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tracks" })).toBeNull();
  });
});

describe("EpicOverview lanes and tracks", () => {
  it("REQ-UI-121 Lanes summary: be, fe, infra, qa with states, and qa waits for be #2 (merge pending), fe #3 (merged), strand 0/1", () => {
    stub();
    show();
    const lanes = within(screen.getByRole("region", { name: "Lanes" }));
    const rows = lanes.getAllByRole("listitem");
    expect(rows.map((r) => r.getAttribute("data-lane"))).toEqual(["be", "fe", "infra", "qa"]);
    expect(rows[0]).toHaveTextContent("Running");
    expect(rows[1]).toHaveTextContent("All tracks closed");
    expect(rows[2]).toHaveTextContent("Idle");
    expect(rows[2]).toHaveTextContent("lease expired");
    expect(rows[3]).toHaveTextContent("Waiting for be");
    expect(rows[3]).toHaveTextContent("Unclaimed, waits for be #2 (merge pending), fe #3 (merged)");
    expect(within(rows[3]).getByRole("img", { name: "1 blocked of 1 tracks" })).toHaveTextContent("0/1");
    expect(rows[3].querySelector("[data-swatch]")).not.toBeNull();
    const colours = rows.map((r) => r.getAttribute("style"));
    expect(new Set(colours).size).toBe(4);
    expect(lanes.getByRole("link", { name: /Open the Lanes tab/ })).toHaveAttribute("href", "/beads/example/ex-e12?tab=lanes");
  });

  it("REQ-UI-121 No lanes section: an epic without lanes has no Lanes section and no colour swatch in the table", () => {
    stub();
    const e3 = bead("ex-e3", { issue_type: "epic" });
    show(ok([e3, bead("ex-e3.1", { parent: "ex-e3" }), bead("ex-e3.2", { parent: "ex-e3" })]), {}, e3);
    expect(screen.queryByRole("heading", { name: "Lanes" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Tracks" })).toBeInTheDocument();
    expect(document.querySelector("[data-swatch]")).toBeNull();
    expect(screen.getAllByText("No lane")).toHaveLength(2);
  });

  it("REQ-UI-121 Tracks table: 8 rows by id, no 'Waits for', and ex-e12.4 reads Blocked, qa, Unassigned and be #2, merge pending", () => {
    stub();
    show();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(8);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual(Array.from({ length: 8 }, (_, i) => `ex-e12.${i + 1}`));
    expect(screen.queryByText(/Waits for/)).toBeNull();
    const row = within(rows[3]);
    expect(row.getByRole("link", { name: t4.id })).toHaveAttribute("href", `/beads/example/${t4.id}`);
    expect(row.getByText("Blocked")).toBeInTheDocument();
    expect(row.getByText("qa")).toBeInTheDocument();
    expect(row.getByText("Unassigned")).toHaveClass("text-muted-foreground");
    expect(row.getByText("be #2, merge pending")).toBeInTheDocument();
    expect(g2.id).toBe(`${E}.9`);
    expect(within(rows[0]).getByText("Order API")).toHaveAttribute("title", "Order API");
    expect(within(rows[0]).getAllByText("–")).toHaveLength(1);
  });

  it("REQ-UI-121 Sort by a column: State twice sorts ascending then descending with aria-sort, and Blocked by is not sortable", async () => {
    stub();
    const user = userEvent.setup();
    show();
    const ids = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
    const state = screen.getByRole("columnheader", { name: "State" });
    expect(state).toHaveAttribute("aria-sort", "none");
    await user.click(within(state).getByRole("button"));
    expect(state).toHaveAttribute("aria-sort", "ascending");
    expect(ids()).toEqual(["ex-e12.1", "ex-e12.3", "ex-e12.5", "ex-e12.8", "ex-e12.2", "ex-e12.6", "ex-e12.7", "ex-e12.4"]);
    await user.click(within(state).getByRole("button"));
    expect(state).toHaveAttribute("aria-sort", "descending");
    expect(ids()).toEqual(["ex-e12.4", "ex-e12.6", "ex-e12.7", "ex-e12.2", "ex-e12.1", "ex-e12.3", "ex-e12.5", "ex-e12.8"]);
    await user.click(within(screen.getByRole("columnheader", { name: "Points" })).getByRole("button"));
    expect(state).toHaveAttribute("aria-sort", "none");
    expect(within(screen.getByRole("columnheader", { name: "Blocked by" })).queryByRole("button")).toBeNull();
  });

  it("REQ-UI-121 Sort by Points: ascending puts tracks without points last, descending keeps them last", async () => {
    stub();
    const user = userEvent.setup();
    const noPoints = bead(`${E}.20`, { parent: E, title: "No points", lane: "be", track: { plan: "p/team.md", number: 20 } });
    show(ok([...E12, noPoints]));
    const points = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[5].textContent);
    const header = screen.getByRole("columnheader", { name: "Points" });
    await user.click(within(header).getByRole("button"));
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(points()).toEqual(["1", "2", "2", "2", "3", "3", "3", "5", "–"]);
    await user.click(within(header).getByRole("button"));
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(points()).toEqual(["5", "3", "3", "3", "2", "2", "2", "1", "–"]);
  });

  it("REQ-UI-121 Narrow table: the table has a minimum width and scrolls sideways inside its own box, keeping all seven columns", () => {
    stub();
    show();
    const table = screen.getByRole("table");
    expect(table).toHaveClass("min-w-[44rem]");
    expect(table.parentElement).toHaveClass("overflow-x-auto");
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
  });
});

