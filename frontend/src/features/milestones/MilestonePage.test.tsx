import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/beads/beadFixtures";
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
    expect(line("end")?.style.left).toBe(`${256 + 3 * 28}px`);
  });

  it("REQ-MILESTONE-UI-003 today from the JSON, whatever the browser's date", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2030-01-01T12:00:00Z") });
    try {
      open(OVERFLOW);
      await row("e-a");
      expect(line("today")?.style.left).toBe(`${256 + 2 * 28 + 14}px`);
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
    expect(screen.getByText("gin-workflow milestone kickstart m-1 --date 2026-11-16")).toBeInTheDocument();
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

  it("REQ-MILESTONE-UI-004 an impossible ?start= date is ignored: no banner, the current plan", async () => {
    open(detail([epicPlan("e-a")]), undefined, "?start=2026-02-31");
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
});
