import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead, json } from "@/features/beads/beadFixtures";
import type { BeadSummary } from "@/features/beads/api";
import type { MilestoneDetail } from "./api";
import { detail, epicPlan, stubMilestones } from "./milestoneFixtures";
import { MilestonePage } from "./MilestonePage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function open(current: MilestoneDetail, preview: (start: string) => Response | Promise<Response> = (start) => json({ ...current, schedule_start: start, preview: true }), search = "") {
  window.history.replaceState(null, "", `/milestones/alpha/m-1${search}`);
  const fetchMock = stubMilestones((url) => {
    const start = url.searchParams.get("start");
    return start === null ? json(current) : preview(start);
  });
  render(<MilestonePage project="alpha" id="m-1" />);
  return fetchMock;
}
const row = async (id: string) => (await screen.findByRole("link", { name: id })).closest("li") ?? document.body;
const beads = (li: HTMLElement) => [...li.querySelectorAll("[data-bead]")].map((b) => b.getAttribute("data-bead"));
const line = (name: string) => document.querySelector<HTMLElement>(`[data-line="${name}"]`);

const OVERFLOW = detail(
  [
    epicPlan("e-a", {
      planned_start: "2026-11-02",
      planned_end: "2026-11-06",
      estimate_days: 5,
      warnings: [{ code: "overflow", days: 2 }],
    }),
  ],
  { end: "2026-11-04", finish: "2026-11-06", overflow_days: 2, today: "2026-11-04" },
);

describe("MilestonePage", () => {
  it("REQ-MILESTONE-UI-003 header states the outcome", async () => {
    open(OVERFLOW);
    expect(await screen.findByRole("heading", { name: "Beta readiness" })).toBeInTheDocument();
    expect(screen.getByText("Finishes 6 Nov, 2 working days past the end")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-003 overflow shown: the bar runs past the end line with its warning", async () => {
    open(OVERFLOW);
    const a = await row("e-a");
    expect(beads(a)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
    expect(a).toHaveTextContent("2 working days past the end");
    expect(line("end")?.style.left).toBe(`${300 + 3 * 132}px`); // label 300, 660 px over 5 working days
  });

  it("REQ-MILESTONE-UI-003 today from the JSON, whatever the browser's date", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2030-01-01T12:00:00Z") });
    try {
      open(OVERFLOW);
      await row("e-a");
      expect(line("today")?.style.left).toBe(`${300 + 2 * 132 + 66}px`);
    } finally {
      vi.useRealTimers();
    }
  });

  it("REQ-MILESTONE-UI-003 external blocker named", async () => {
    open(
      detail([
        epicPlan("e-a", {
          warnings: [{ code: "external_blocker", days: null }],
          external_depends_on: [{ id: "E9", milestone: "M2" }],
        }),
      ]),
    );
    expect(await row("e-a")).toHaveTextContent("Blocked by E9 (in M2)");
  });

  it("REQ-MILESTONE-UI-003 weekend skipped", async () => {
    open(detail([epicPlan("e-a", { planned_start: "2026-11-05", planned_end: "2026-11-09" })], { finish: "2026-11-09" }));
    expect(beads(await row("e-a"))).toEqual(["2026-11-05", "2026-11-06", "2026-11-09"]);
  });

  it("REQ-MILESTONE-UI-004 preview: picker defaults to kickoff, redraws from the picked date with the command", async () => {
    const fetchMock = open(detail([epicPlan("e-a")], { status: "scheduled", kickoff: "2026-11-09" }), (start) =>
      json(detail([epicPlan("e-a", { planned_start: "2026-11-16", planned_end: "2026-11-18" })], { status: "scheduled", schedule_start: start, preview: true, finish: "2026-11-18" })),
    );
    const picker = await screen.findByLabelText("Kick-start date");
    expect(picker).toHaveValue("2026-11-09");
    fireEvent.change(picker, { target: { value: "2026-11-16" } });
    await waitFor(() => expect(beads(document.querySelector("[data-epic='e-a']") ?? document.body)[0]).toBe("2026-11-16"));
    expect(screen.getByText(/Preview from Mon 16 Nov\. Nothing changes until you run:/)).toBeInTheDocument();
    expect(screen.getByText("gin milestone kickstart m-1 --date 2026-11-16")).toBeInTheDocument();
    expect(window.location.search).toBe("?start=2026-11-16");
    expect(fetchMock.mock.calls.some(([input]) => typeof input === "string" && input.includes("start=2026-11-16"))).toBe(true);
  });

  it("REQ-MILESTONE-UI-004 Reset returns to the current plan", async () => {
    open(detail([epicPlan("e-a")]), undefined, "?start=2026-11-16");
    await userEvent.click(await screen.findByRole("button", { name: "Reset" }));
    expect(window.location.search).toBe("");
    await waitFor(() => expect(screen.queryByText(/Preview from/)).toBeNull());
  });

  it("REQ-MILESTONE-UI-004 preview loading: the banner shows and no plan is drawn", async () => {
    open(detail([epicPlan("e-a")]), () => new Promise<Response>(() => undefined), "?start=2026-11-16");
    expect(await screen.findByText(/Preview from Mon 16 Nov\./)).toBeInTheDocument();
    expect(screen.getByText("Loading preview…")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-bead]")).toHaveLength(0);
  });

  const later = (start: string) =>
    json(detail([epicPlan("e-a", { planned_start: "2026-11-16", planned_end: "2026-11-18" })], { schedule_start: start, preview: true }));

  it("REQ-MILESTONE-UI-004 picking a second date never draws the first preview under it", async () => {
    open(detail([epicPlan("e-a")]), (start) => (start === "2026-11-16" ? later(start) : new Promise<Response>(() => undefined)), "?start=2026-11-16");
    await waitFor(() => expect(document.querySelectorAll("[data-bead]").length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText("Kick-start date"), { target: { value: "2026-11-23" } });
    expect(await screen.findByText(/Preview from Mon 23 Nov\./)).toBeInTheDocument();
    expect(document.querySelectorAll("[data-bead]")).toHaveLength(0);
  });

  it("REQ-MILESTONE-UI-004 a second date that fails shows the error and no bars", async () => {
    open(
      detail([epicPlan("e-a")]),
      (start) => (start === "2026-11-16" ? later(start) : json({ error: "dependency cycle: A -> B -> A", cause: null }, 502)),
      "?start=2026-11-16",
    );
    await waitFor(() => expect(document.querySelectorAll("[data-bead]").length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText("Kick-start date"), { target: { value: "2026-11-23" } });
    expect(await screen.findByText("dependency cycle: A -> B -> A")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-bead]")).toHaveLength(0);
  });

  it.each(["2026-02-31", "2026-13-45", "2026-00-10"])("REQ-MILESTONE-UI-004 an impossible ?start=%s is ignored: no banner, the current plan", async (date) => {
    open(detail([epicPlan("e-a")]), undefined, `?start=${date}`);
    expect(beads(await row("e-a"))).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(screen.queryByText(/Preview from/)).toBeNull();
  });

  it.each(["active", "closed"])("REQ-MILESTONE-UI-004 %s milestone: no picker", async (status) => {
    open(detail([epicPlan("e-a")], { status }));
    await row("e-a");
    expect(screen.queryByLabelText("Kick-start date")).toBeNull();
  });

  it("REQ-MILESTONE-UI-004 preview fails: the error and no bars", async () => {
    open(detail([epicPlan("e-a")]), () => json({ error: "dependency cycle: A -> B -> A", cause: null }, 502));
    fireEvent.change(await screen.findByLabelText("Kick-start date"), { target: { value: "2026-11-16" } });
    expect(await screen.findByText("dependency cycle: A -> B -> A")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-bead]")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-005 a milestone that cannot be read names the cause", async () => {
    window.history.replaceState(null, "", "/milestones/alpha/m-1");
    stubMilestones(() => json({ error: "milestones need providers.task_tracking: beads", cause: "tracking" }, 502));
    render(<MilestonePage project="alpha" id="m-1" />);
    expect(await screen.findByText("This project tracks tasks in markdown")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-003 an empty milestone says how to add epics", async () => {
    open(detail([], { finish: null }));
    expect(await screen.findByText(/No epics in this milestone/)).toBeInTheDocument();
    expect(within(document.body).getByText("/roadmap --milestone m-1")).toBeInTheDocument();
  });

  const graphBeads = [
    bead("m-1", { issue_type: "milestone" }),
    bead("m-2", { issue_type: "milestone" }),
    bead("e-a", { issue_type: "epic", parent: "m-1", blocked_by: ["e-x"] }),
    bead("e-b", { issue_type: "epic", parent: "m-1", blocked_by: ["e-a"] }),
    bead("e-x", { issue_type: "epic", parent: "m-2" }),
  ];
  const graphNode = (id: string) => screen.findByRole("button", { name: new RegExp(`^${id}`) });

  it("REQ-MILESTONE-UI-002 graph: the milestone's epics with their edge, outside epics external", async () => {
    window.history.replaceState(null, "", "/milestones/alpha/m-1?tab=graph");
    stubMilestones(() => json(detail([epicPlan("e-a"), epicPlan("e-b")])), graphBeads);
    render(<MilestonePage project="alpha" id="m-1" />);
    expect(await graphNode("e-a")).toHaveAttribute("data-external", "false");
    expect(await graphNode("e-b")).toHaveAttribute("data-external", "false");
    expect(await graphNode("e-x")).toHaveAttribute("data-external", "true");
    expect(screen.queryByRole("button", { name: /^m-1/ })).toBeNull();
    expect(screen.getByText("Dashed nodes are outside this milestone.")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-002 the tabs switch between Gantt and Graph in the URL", async () => {
    open(detail([epicPlan("e-a")]));
    await userEvent.click(await screen.findByRole("tab", { name: "Graph" }));
    expect(window.location.search).toBe("?tab=graph");
    await userEvent.click(screen.getByRole("tab", { name: "Gantt" }));
    expect(window.location.search).toBe("");
  });

  const LONG = detail([epicPlan("e-a", { planned_start: "2026-11-02", planned_end: "2026-11-27", estimate_days: 20 })], {
    end: "2026-11-27",
    finish: "2026-11-27",
    today: "2026-11-11",
  });
  const range = () => document.querySelector("[data-range]")?.textContent;
  const pressed = () => within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { pressed: true });

  it("REQ-MILESTONE-UI-011 whole milestone by default fills the width", async () => {
    open(OVERFLOW);
    await row("e-a");
    expect(pressed()).toHaveTextContent("Whole milestone");
    expect(document.querySelector<HTMLElement>("[data-scroller] > div")?.style.width).toBe("960px");
    expect(range()).toBeUndefined();
  });

  it("REQ-MILESTONE-UI-011 two weeks from today, kept in the URL", async () => {
    open(LONG);
    await row("e-a");
    await userEvent.click(screen.getByRole("button", { name: "2 weeks" }));
    expect(window.location.search).toBe("?zoom=2w");
    expect(pressed()).toHaveTextContent("2 weeks");
    expect(range()).toBe("9 Nov – 22 Nov");
  });

  it("REQ-MILESTONE-UI-011 unknown zoom is the whole milestone", async () => {
    open(LONG, undefined, "?zoom=3w");
    await row("e-a");
    expect(pressed()).toHaveTextContent("Whole milestone");
  });

  it("REQ-MILESTONE-UI-011 zoom kept with the preview and the tabs", async () => {
    open(detail([epicPlan("e-a")], { status: "scheduled", kickoff: "2026-11-09" }), (start) =>
      json(detail([epicPlan("e-a", { planned_start: "2026-11-16", planned_end: "2026-11-18" })], { status: "scheduled", schedule_start: start, preview: true, finish: "2026-11-18" })),
      "?zoom=1w",
    );
    fireEvent.change(await screen.findByLabelText("Kick-start date"), { target: { value: "2026-11-16" } });
    expect(window.location.search).toBe("?start=2026-11-16&zoom=1w");
    await waitFor(() => expect(beads(document.querySelector("[data-epic='e-a']") ?? document.body)[0]).toBe("2026-11-16"));
    expect(pressed()).toHaveTextContent("1 week");
    await userEvent.click(screen.getByRole("tab", { name: "Graph" }));
    expect(window.location.search).toBe("?tab=graph&start=2026-11-16&zoom=1w");
  });

  const epicBeads = [
    bead("e-a.2", { parent: "e-a", status: "in_progress", title: "Wire the pager" }),
    bead("e-a.1", { parent: "e-a", status: "closed", closed_at: "2026-11-01T04:15:36Z" }),
    bead("e-b.1", { parent: "e-b" }),
  ];
  const openWithBeads = (beadsAnswer: BeadSummary[] | ((url: URL) => Response)) => {
    window.history.replaceState(null, "", "/milestones/alpha/m-1");
    const fetchMock = stubMilestones(() => json(detail([epicPlan("e-a"), epicPlan("e-b"), epicPlan("e-c")])), beadsAnswer);
    render(<MilestonePage project="alpha" id="m-1" />);
    return fetchMock;
  };

  it("REQ-MILESTONE-UI-015 expand an epic to list its children; the others stay collapsed", async () => {
    const fetchMock = openWithBeads(epicBeads);
    const toggle = await screen.findByRole("button", { name: "Show 2 child beads of e-a" });
    expect(await row("e-a")).toHaveTextContent("1/2 closed");
    expect(fetchMock.mock.calls.some(([input]) => typeof input === "string" && input.startsWith("/api/beads") && input.includes("closed=1"))).toBe(true);
    expect(within(await row("e-c")).queryByRole("button")).toBeNull();
    expect(await row("e-c")).not.toHaveTextContent("closed");
    expect(document.querySelectorAll("[data-child]")).toHaveLength(0);
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const children = [...document.querySelectorAll<HTMLElement>("[data-child]")];
    expect(children.map((c) => c.dataset.child)).toEqual(["e-a.1", "e-a.2"]);
    expect(children[0]).toHaveTextContent("closed 1 Nov");
    expect(children[1]).toHaveTextContent("Wire the pager");
    expect(children[1]).toHaveTextContent("In progress");
    expect(within(children[0]).getByRole("link", { name: ".1" })).toHaveAttribute("href", "/beads/alpha/e-a.1");
    expect(children[0].querySelector("[data-shade]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Show 1 child bead of e-b" })).toHaveAttribute("aria-expanded", "false");
  });

  it("REQ-MILESTONE-UI-015 beads unavailable: no expand buttons, the plan still drawn", async () => {
    openWithBeads(() => json({ error: "bd failed" }, 502));
    const a = await row("e-a");
    expect(beads(a)).toHaveLength(3);
    await waitFor(() => expect(within(a).queryByRole("button")).toBeNull());
    expect(a).not.toHaveTextContent("closed");
  });

  it("REQ-MILESTONE-UI-017 lanes shown in the header", async () => {
    open({ ...OVERFLOW, lanes: 2 });
    const header = (await screen.findByRole("heading", { name: "Beta readiness" })).closest("header") ?? document.body;
    expect(within(header).getByText("2 lanes")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-017 older gin-workflow: no lane count", async () => {
    open(OVERFLOW);
    const header = (await screen.findByRole("heading", { name: "Beta readiness" })).closest("header") ?? document.body;
    expect(within(header).queryByText(/\blanes?\b/)).toBeNull();
  });

  it("REQ-MILESTONE-UI-003 lane-bound dates: B starts after A on one lane", async () => {
    open(
      detail(
        [
          epicPlan("e-a", { planned_start: "2026-11-09", planned_end: "2026-11-10", estimate_days: 2 }),
          epicPlan("e-b", { planned_start: "2026-11-11", planned_end: "2026-11-12", estimate_days: 2 }),
        ],
        { start: "2026-11-09", end: "2026-11-13", schedule_start: "2026-11-09", finish: "2026-11-12", lanes: 1 },
      ),
    );
    expect(beads(await row("e-a"))).toEqual(["2026-11-09", "2026-11-10"]);
    expect(beads(await row("e-b"))).toEqual(["2026-11-11", "2026-11-12"]);
  });
});
