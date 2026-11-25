import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadDetail, BeadSummary, Comment } from "./api";
import { bead, json } from "./beadFixtures";
import { BeadDetailPage } from "./BeadDetailPage";
import { epicPath } from "./EpicPage";
import { parseFilters } from "./filters";
import { E12, e12 } from "./laneFixtures";

const detail = (b: BeadSummary, over: Partial<BeadDetail> = {}): BeadDetail => ({
  ...b,
  description: "Why this epic",
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

const note = (id: string): Comment => ({ id, author: "alice", text: `Text of ${id}`, created_at: "2026-10-05T10:00:00Z", truncated: false });

/** `/api/beads` answers `list`; the bead page answers the detail of `beads[id]`. */
function stub(list: BeadSummary[], details: Record<string, BeadDetail>, comments: Comment[] = [], beadsStatus = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(text, "http://localhost");
      if (url.pathname === "/api/beads") return Promise.resolve(beadsStatus === 200 ? json(list) : json({ detail: "beads broke" }, beadsStatus));
      if (url.pathname === "/api/beads/milestones") return Promise.resolve(json({ milestones: [], current: null }));
      const match = /^\/api\/beads\/[^/]+\/([^/]+)(\/comments)?$/.exec(url.pathname);
      if (match !== null && match[2] !== undefined) return Promise.resolve(json(comments));
      if (match !== null && details[match[1]] !== undefined) return Promise.resolve(json(details[match[1]]));
      return Promise.resolve(json({}, 404));
    }),
  );
}

const e12Detail = detail(e12[0], {
  comment_count: 2,
  children: e12.filter((b) => b.parent === E12 && b.waits_for === null).map((b) => ({ id: b.id, title: b.title, status: b.status, type: "parent-child" as const, prep: false })),
});
const stubE12 = () => stub(e12, { [E12]: e12Detail }, [note("c-1"), note("c-2")]);

// ex-e3-like: tracks without a lane
const e3 = bead("ex-e3", { issue_type: "epic" });
const e3Kids = [bead("ex-e3.1", { parent: "ex-e3" }), bead("ex-e3.2", { parent: "ex-e3", blocked_by: ["ex-e3.1"] })];
const stubE3 = (over: Partial<BeadDetail> = {}) =>
  stub([e3, ...e3Kids], { "ex-e3": detail(e3, over), "ex-e3.2": detail(e3Kids[1]) });

const open = (id: string, search = "") => {
  window.history.replaceState(null, "", `/beads/example/${id}${search}`);
  render(<BeadDetailPage project="example" id={id} />);
};
const tabs = () => within(screen.getByRole("tablist", { name: "Epic views" }));
const names = () => screen.getAllByRole("tab").map((t) => t.textContent);
const selected = () => screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.textContent);

beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("EpicPage", () => {
  it("REQ-UI-119 Opens on Overview: the tabs Overview, Graph, Lanes and Discussion (2), the header above and no discussion column", async () => {
    stubE12();
    open(E12);
    await screen.findByRole("tab", { name: "Lanes" });
    expect(names()).toEqual(["Overview", "Graph", "Lanes", "Discussion (2)"]);
    expect(selected()).toEqual(["Overview"]);
    expect(screen.getByRole("heading", { name: "Team checkout" })).toBeInTheDocument();
    expect(screen.getByText("Why this epic")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-overview");
    // REQ-UI-119: no REQ-UI-068 column or REQ-UI-069 tabs; the comments are not loaded on Overview
    expect(screen.queryByRole("tab", { name: "Details" })).toBeNull();
    expect(screen.queryByText("Text of c-1")).toBeNull();
    expect(document.getElementById("panel-discussion")).toBeNull();
    expect(screen.queryByRole("button", { name: /discussion/i })).toBeNull();
    expect(screen.queryByRole("region", { name: "Discussion" })).toBeNull();
  });

  it("REQ-UI-119 Overview without a Children list: no Children heading, children strand or merge gate row, the Description heading and text, and Depends on kept", async () => {
    const gate = e12.find((b) => b.waits_for !== null);
    const withGate = detail(e12[0], {
      description: "Why this epic",
      dependencies: [{ id: "ex-m2", title: "Checkout v2", status: "open", type: "blocks" }],
      children: e12.filter((b) => b.parent === E12).map((b) => ({ id: b.id, title: b.title, status: b.status, type: "parent-child" as const, prep: false, waits_for: b.waits_for })),
    });
    stub(e12, { [E12]: withGate });
    open(E12);
    await screen.findByRole("heading", { name: "Tracks" });
    expect(screen.getByRole("heading", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByText("Why this epic")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Depends on" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Children" })).toBeNull();
    // REQ-UI-138: the small strand "4/8" of the bead page is not drawn; the Progress card has the large one
    expect(screen.queryByText("4/8")).toBeNull();
    expect(gate).toBeDefined();
    expect(screen.queryByText(/Waits for/)).toBeNull();
  });

  it("REQ-UI-119 Tab in the URL: choosing Graph puts tab=graph in the URL and draws the Graph view of the epic with the filters", async () => {
    stubE12();
    open(E12);
    await userEvent.click(await screen.findByRole("tab", { name: "Graph" }));
    expect(window.location.pathname).toBe(`/beads/example/${E12}`);
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("graph");
    expect(selected()).toEqual(["Graph"]);
    expect(await screen.findByRole("searchbox", { name: "Search" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Lane be" })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("tab", { name: "Overview" }));
    expect(window.location.search).toBe("");
  });

  it("REQ-UI-119 No Lanes tab without lanes: ?tab=lanes on ex-e3 opens Overview", async () => {
    stubE3();
    open("ex-e3", "?tab=lanes");
    await screen.findByRole("tab", { name: "Overview" });
    await waitFor(() => expect(screen.getByText("Why this epic")).toBeInTheDocument());
    expect(names()).toEqual(["Overview", "Graph", "Discussion (0)"]);
    expect(selected()).toEqual(["Overview"]);
  });

  it("REQ-UI-119 an unknown tab opens Overview", async () => {
    stubE3();
    open("ex-e3", "?tab=nope");
    await screen.findByRole("tab", { name: "Overview" });
    expect(selected()).toEqual(["Overview"]);
  });

  it("REQ-UI-119 a known tab in the URL opens that tab", async () => {
    stubE3();
    open("ex-e3", "?tab=discussion");
    await screen.findByText("No comments");
    expect(selected()).toEqual(["Discussion (0)"]);
    expect(screen.queryByText("Why this epic")).toBeNull();
  });

  it("REQ-UI-119 Not an epic: a task has no Overview, Graph or Lanes tab and keeps the layout of REQ-UI-068", async () => {
    stubE3();
    open("ex-e3.2");
    await screen.findByRole("heading", { name: "Title ex-e3.2" });
    expect(screen.queryByRole("tab", { name: "Overview" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Graph" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Lanes" })).toBeNull();
    expect(screen.queryByRole("tablist", { name: "Epic views" })).toBeNull();
  });

  it("REQ-UI-119 Left and Right move between the tabs with aria-selected and wrap", async () => {
    stubE12();
    open(E12);
    const overview = await screen.findByRole("tab", { name: "Lanes" }).then(() => screen.getByRole("tab", { name: "Overview" }));
    overview.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(selected()).toEqual(["Graph"]);
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("graph");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(selected()).toEqual(["Discussion (2)"]);
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("discussion");
    await userEvent.keyboard("{ArrowRight}");
    expect(selected()).toEqual(["Overview"]);
    expect(tabs().getByRole("tab", { name: "Overview" })).toHaveFocus();
  });

  it("REQ-UI-119 Discussion (N): the comments of the epic are shown on the Discussion tab", async () => {
    stubE12();
    open(E12, "?tab=discussion");
    expect(await screen.findByText("Text of c-1")).toBeInTheDocument();
    expect(screen.getByText("Text of c-2")).toBeInTheDocument();
    expect(selected()).toEqual(["Discussion (2)"]);
  });

  it("REQ-UI-119 Discussion without comments says No comments", async () => {
    stubE3({ comment_count: 0 });
    open("ex-e3", "?tab=discussion");
    expect(await screen.findByText("No comments")).toBeInTheDocument();
  });

  it("REQ-UI-119 the Lanes tab draws the Lanes view of the epic, without the view tabs, the milestone filter or the scope trail", async () => {
    stubE12();
    open(E12, "?tab=lanes");
    expect(await screen.findByTestId("lanes-canvas")).toBeInTheDocument();
    expect(selected()).toEqual(["Lanes"]);
    expect(screen.queryByRole("navigation", { name: "View" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Lanes scope" })).toBeNull();
    expect(screen.queryByText("Milestone")).toBeNull();
  });

  it("REQ-UI-106 Graph tab of an epic: the tasks are the nodes, no node is selected and no details panel is shown", async () => {
    stubE3();
    open("ex-e3", "?tab=graph");
    expect(await screen.findByRole("button", { name: /^ex-e3\.1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ex-e3\.2/ })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Graph scope" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "View" })).toBeNull();
  });

  it("REQ-UI-106 a click selects a node and keeps select in the URL, Escape gives select=none", async () => {
    stubE3();
    open("ex-e3", "?tab=graph");
    await userEvent.click(await screen.findByRole("button", { name: /^ex-e3\.1/ }));
    expect(new URLSearchParams(window.location.search).get("select")).toBe("ex-e3.1");
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("graph");
    expect(await screen.findByRole("complementary", { name: "Bead details" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(new URLSearchParams(window.location.search).get("select")).toBe("none");
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
  });

  it("REQ-UI-119 opening a node with children opens its bead page and the scope stays the epic", async () => {
    const e9 = bead("e-9", { issue_type: "epic" });
    const mid = bead("e-9.1", { parent: "e-9" });
    const leaf = bead("e-9.1.1", { parent: "e-9.1" });
    stub([e9, mid, leaf], { "e-9": detail(e9) });
    open("e-9", "?tab=graph");
    await userEvent.dblClick(await screen.findByRole("button", { name: /^e-9\.1/ }));
    expect(window.location.pathname).toBe("/beads/example/e-9.1");
    expect(window.location.search).toBe("");
  });

  it("REQ-UI-119 No tracks: an epic without children says so on the Graph tab", async () => {
    stub([e3], { "ex-e3": detail(e3) });
    open("ex-e3", "?tab=graph");
    expect(await screen.findByText("No tracks")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Search" })).toBeNull();
  });

  it("REQ-UI-053 Epic: no View in graph, the Graph tab is offered instead", async () => {
    stubE3({ children: [{ id: "ex-e3.1", title: "T", status: "open", type: "parent-child", prep: false }] });
    open("ex-e3");
    await screen.findByRole("tab", { name: "Graph" });
    expect(screen.queryByRole("link", { name: "View in graph" })).toBeNull();
  });

  it("REQ-UI-119 Details panel: the details panel of an epic keeps its compact form with Open page", async () => {
    stubE3();
    window.history.replaceState(null, "", "/beads/example/ex-e3");
    render(<BeadDetailPage project="example" id="ex-e3" embedded />);
    expect(await screen.findByRole("link", { name: "Open page" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Epic views" })).toBeNull();
  });

  it("REQ-UI-122 Graph tab canvas: as tall as its content, scrolls only sideways", async () => {
    stubE3();
    open("ex-e3", "?tab=graph");
    const canvas = await screen.findByTestId("graph-canvas");
    for (const c of ["overflow-x-auto", "overflow-y-hidden", "overscroll-x-contain"]) expect(canvas).toHaveClass(c);
    expect(Number.parseFloat(canvas.style.height)).toBeGreaterThan(0);
    expect(canvas.className).not.toContain("100dvh");
  });

  it("REQ-UI-122 Graph tab canvas of an epic with lanes: the lane box canvas scrolls only sideways", async () => {
    stubE12();
    open(E12, "?tab=graph");
    const canvas = await screen.findByTestId("graph-canvas");
    for (const c of ["overflow-x-auto", "overflow-y-hidden"]) expect(canvas).toHaveClass(c);
    expect(canvas.style.height).not.toBe("");
  });
});

describe("EpicPage loading and errors", () => {
  it("REQ-UI-119 ?tab=lanes of an epic with lanes never shows Overview while the beads load", async () => {
    stubE12();
    open(E12, "?tab=lanes");
    await screen.findByRole("tablist", { name: "Epic views" });
    expect(selected()).toEqual(["Lanes"]);
    expect(screen.queryByText("Why this epic")).toBeNull();
    expect(await screen.findByTestId("lanes-canvas")).toBeInTheDocument();
    expect(selected()).toEqual(["Lanes"]);
  });

  it("REQ-UI-119 ?tab=lanes with beads that fail shows the error with Retry, not Overview", async () => {
    stub([], { [E12]: e12Detail }, [], 500);
    open(E12, "?tab=lanes");
    expect(await screen.findByText("Beads could not be loaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(selected()).toEqual(["Lanes"]);
    expect(screen.queryByText("Why this epic")).toBeNull();
  });

  it("REQ-UI-119 ?tab=graph with beads that fail shows the error with Retry", async () => {
    stub([], { [E12]: e12Detail }, [], 500);
    open(E12, "?tab=graph");
    expect(await screen.findByText("Beads could not be loaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(selected()).toEqual(["Graph"]);
  });

  it("REQ-UI-119 typing in Search on the Graph tab writes q and keeps tab=graph", async () => {
    stubE3();
    open("ex-e3", "?tab=graph");
    await userEvent.type(await screen.findByRole("searchbox", { name: "Search" }), "x");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("x");
    expect(params.get("tab")).toBe("graph");
    expect(window.location.pathname).toBe("/beads/example/ex-e3");
  });
});

describe("EpicPage next command", () => {
  /** `stubE3` plus the workflow answer: a stage, or a status for an error; `hold` keeps the request pending. */
  function withWorkflow(answer: string | number, hold = false) {
    stubE3({ status: "in_progress" });
    const base = vi.mocked(fetch).getMockImplementation();
    if (base === undefined) throw new Error("no stub");
    const mock = vi.fn((input: RequestInfo | URL) => {
      const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!new URL(text, "http://localhost").pathname.endsWith("/workflow")) return base(input);
      if (hold) return new Promise<Response>(() => undefined);
      if (typeof answer === "number") return Promise.resolve(json({ error: "gin state failed" }, answer));
      return Promise.resolve(json({ stage: answer, gates: {}, warnings: [], review_waivers: [] }));
    });
    vi.stubGlobal("fetch", mock);
    return mock;
  }
  const workflowCalls = (mock: ReturnType<typeof withWorkflow>) =>
    mock.mock.calls.filter(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url).endsWith("/workflow")).length;

  // REQ-BEADS-025 Scenario: epic command after the workflow loads
  it("REQ-UI-151 REQ-BEADS-025 the epic command appears once the workflow loads, with one workflow request", async () => {
    const mock = withWorkflow("orchestrate");
    open("ex-e3");
    expect(await screen.findByText("/gin:orchestrate ex-e3")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Stages" })).toBeInTheDocument();
    expect(workflowCalls(mock)).toBe(1);
  });

  it("REQ-UI-151 a closed task's bead page shows no Next command", async () => {
    const closed = bead("ex-t9", { status: "closed", closed_at: "2026-10-10T12:00:00Z" });
    stub([closed], { "ex-t9": detail(closed) });
    open("ex-t9");
    expect(await screen.findByRole("heading", { name: closed.title })).toBeInTheDocument();
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("REQ-UI-151 REQ-BEADS-025 no epic command while the workflow loads", async () => {
    withWorkflow("plan", true);
    open("ex-e3");
    expect(await screen.findByText("Loading workflow…")).toBeInTheDocument();
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("REQ-UI-151 REQ-UI-120 no epic command when the workflow fails; the card shows the error with Retry", async () => {
    withWorkflow(502);
    open("ex-e3");
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("REQ-UI-151 REQ-UI-120 an empty stage shows No workflow and no command", async () => {
    withWorkflow("");
    open("ex-e3");
    expect(await screen.findByText("No workflow")).toBeInTheDocument();
    expect(screen.queryByText("Next")).toBeNull();
  });
});

describe("epicPath", () => {
  it("REQ-UI-119 builds the URL with tab and filters, without tab for Overview and without project, view, scope or milestone", () => {
    expect(epicPath("my proj", "e-1", "overview")).toBe("/beads/my%20proj/e-1");
    expect(epicPath("p", "e-1", "graph")).toBe("/beads/p/e-1?tab=graph");
    const filters = parseFilters("?project=p&view=graph&scope=e-1&milestone=all&q=x&select=e-1.1");
    expect(epicPath("p", "e-1", "lanes", filters)).toBe("/beads/p/e-1?tab=lanes&q=x&select=e-1.1");
  });
});
