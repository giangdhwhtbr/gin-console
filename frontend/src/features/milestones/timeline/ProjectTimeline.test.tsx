import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MilestoneList } from "../api";
import { closedEpic, entry, forecast, forecastEpic, forecastMilestone, list } from "../milestoneFixtures";
import { ProjectTimeline } from "./ProjectTimeline";
import type { Zoom } from "./axis";

afterEach(cleanup);

type Options = { zoom?: Zoom; showClosed?: boolean };
function show(data: MilestoneList, { zoom = "months", showClosed = false }: Options = {}) {
  const onZoom = vi.fn();
  const onShowClosed = vi.fn();
  const view = render(<ProjectTimeline project="alpha" list={data} zoom={zoom} showClosed={showClosed} onZoom={onZoom} onShowClosed={onShowClosed} />);
  return { ...view, onZoom, onShowClosed };
}
const px = (el: HTMLElement, property: "left" | "width") => Number.parseFloat(el.style[property]);
const chart = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-scroller]") ?? document.body;
const overrunOf = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-overrun]");

const m2 = entry("ex-m2", { title: "Payments", status: "active", start: "2026-11-16", end: "2026-12-04", finish: "2027-07-02" });
const e13 = forecastEpic("ex-e13", {
  title: "Multi-currency pricing",
  milestone: "ex-m2",
  planned_start: "2026-12-11",
  planned_end: "2027-02-02",
  remaining_days: 38,
  lane: 1,
  warnings: [{ code: "overflow", days: 42, count: null }],
});
const withEpics = (...epics: ReturnType<typeof forecastEpic>[]) =>
  list([m2], {
    today: "2026-11-26",
    forecast: forecast({ deadline: null, finish: "2027-07-02", epics, milestones: [forecastMilestone("ex-m2", { start: "2026-12-11", finish: "2027-07-02" })] }),
  });

describe("ProjectTimeline", () => {
  it("REQ-MILESTONE-UI-035 a milestone row with its bar and hatched overrun, and an epic row with lane, days left, warning and named bar", () => {
    const { container } = show(withEpics(e13));
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("href", "/milestones/alpha/ex-m2");
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Finishes 2 Jul 2027")).toBeInTheDocument();
    // axis starts 16 Nov; a day is 6px on Months
    const bar = container.querySelector<HTMLElement>('[data-bar="milestone"]');
    expect(bar).not.toBeNull();
    expect([px(bar as HTMLElement, "left"), px(bar as HTMLElement, "width")]).toEqual([0, 19 * 6]);
    const overrun = overrunOf(container) as HTMLElement;
    expect([px(overrun, "left"), px(overrun, "width")]).toEqual([19 * 6, 210 * 6]);
    const row = screen.getByRole("link", { name: "Multi-currency pricing" }).closest("li") ?? document.body;
    expect(screen.getByRole("link", { name: "Multi-currency pricing" })).toHaveAttribute("href", "/beads/alpha/ex-e13");
    expect(row).toHaveTextContent("Lane 1");
    expect(row).toHaveTextContent("38 d left");
    expect(row.querySelector('svg[data-glyph="deferred"]')).not.toBeNull();
    expect(screen.getByLabelText("Multi-currency pricing: planned 11 Dec – 2 Feb, 38 days left, 42 days over")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-035 the bars are decoration beside the links of the labels", () => {
    show(withEpics(e13));
    const bar = screen.getByLabelText(/^Multi-currency pricing: planned/);
    expect(bar.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: "Multi-currency pricing" }).closest('[aria-hidden="true"]')).toBeNull();
  });

  it("REQ-MILESTONE-UI-035 epics of no milestone sit in one group Not in a milestone, in forecast order", () => {
    show(list([], { today: "2026-11-26", forecast: forecast({ epics: [forecastEpic("c"), forecastEpic("a", { milestone: "gone" }), forecastEpic("b")] }) }));
    expect(screen.getByText("Not in a milestone")).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["Title c", "Title a", "Title b"]);
  });

  it("REQ-MILESTONE-UI-035 the groups come in order: closed, chained, other open, then Not in a milestone", () => {
    const data = list(
      [
        entry("m4", { title: "Four", status: "planned", start: "2026-12-20", end: "2026-12-30" }),
        entry("m3", { title: "Three", status: "planned", start: "2026-12-10", end: "2026-12-18" }),
        entry("m0", { title: "Zero", status: "closed", start: "2026-09-01", end: "2026-09-30", finish: "2026-09-28" }),
        entry("m2", { title: "Two", status: "active", start: "2026-11-02", end: "2026-12-04" }),
      ],
      {
        today: "2026-11-26",
        forecast: forecast({
          epics: [forecastEpic("loose")],
          milestones: [forecastMilestone("m2"), forecastMilestone("m3")],
        }),
        closed_epics: [],
      },
    );
    show(data, { showClosed: true });
    const order = screen.getAllByRole("link").map((a) => a.textContent);
    expect(order).toEqual(["Zero", "Two", "Three", "Four", "Title loose"]);
    expect(screen.getByText("Not in a milestone")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-036 the zoom buttons are pressed by zoom and ask for another zoom", async () => {
    const { onZoom } = show(withEpics(e13), { zoom: "months" });
    const group = screen.getByRole("group", { name: "Zoom" });
    expect(within(group).getByRole("button", { name: "Months" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group).getByRole("button", { name: "Weeks" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(within(group).getByRole("button", { name: "Quarters" }));
    expect(onZoom).toHaveBeenCalledWith("quarters");
  });

  it("REQ-MILESTONE-UI-036 Quarters: a day is 2px and the header reads quarters", () => {
    const { container } = show(withEpics(e13), { zoom: "quarters" });
    const overrun = overrunOf(container) as HTMLElement;
    expect(px(overrun, "width")).toBe(210 * 2);
    const header = screen.getByTestId("axis-header");
    expect(header).toHaveTextContent("Q4 2026");
    expect(header).toHaveTextContent("Q1 2027");
  });

  it("REQ-MILESTONE-UI-036 Weeks across a year end label each Monday and shade the weekends", () => {
    const data = list([], {
      today: "2026-12-21",
      forecast: forecast({ deadline: null, finish: "2027-01-15", epics: [forecastEpic("e", { planned_start: "2026-12-21", planned_end: "2027-01-15" })] }),
    });
    const { container } = show(data, { zoom: "weeks" });
    const header = screen.getByTestId("axis-header");
    for (const label of ["21 Dec", "28 Dec", "4 Jan", "11 Jan"]) expect(within(header).getByText(label)).toBeInTheDocument();
    expect(container.querySelectorAll("[data-weekend]").length).toBeGreaterThan(0);
  });

  it("REQ-MILESTONE-UI-036 weekends are shaded only on Weeks", () => {
    const { container } = show(withEpics(e13), { zoom: "months" });
    expect(container.querySelectorAll("[data-weekend]")).toHaveLength(0);
  });

  it("REQ-MILESTONE-UI-036 lines and chips for today and the deadline; opens with today near the left edge", () => {
    const data = withEpics(e13);
    data.forecast = forecast({ ...data.forecast, deadline: "2026-12-11" });
    const { container } = show(data);
    const today = container.querySelector<HTMLElement>('[data-line="today"]') as HTMLElement;
    const deadline = container.querySelector<HTMLElement>('[data-line="deadline"]') as HTMLElement;
    expect(px(today, "left")).toBe(10 * 6); // 26 Nov, 10 days after 16 Nov
    expect(px(deadline, "left")).toBe(25 * 6);
    const header = screen.getByTestId("axis-header");
    expect(within(header).getByText("Today")).toBeInTheDocument();
    expect(within(header).getByText("Deadline")).toBeInTheDocument();
    expect(chart(container).scrollLeft).toBe(10 * 6 - 40);
  });

  it("REQ-MILESTONE-UI-036 a deadline before the axis draws no line and no chip", () => {
    const data = list([], {
      today: "2026-11-26",
      forecast: forecast({ deadline: "2026-11-01", finish: "2026-12-10", epics: [forecastEpic("e", { planned_start: "2026-11-10", planned_end: "2026-12-10" })] }),
    });
    const { container } = show(data);
    expect(container.querySelector('[data-line="deadline"]')).toBeNull();
    expect(screen.queryByText("Deadline")).not.toBeInTheDocument();
    expect(container.querySelector('[data-line="today"]')).not.toBeNull();
  });

  it("REQ-MILESTONE-UI-036 no deadline, no Deadline line", () => {
    const { container } = show(withEpics(e13));
    expect(container.querySelector('[data-line="deadline"]')).toBeNull();
  });

  it("REQ-MILESTONE-UI-036 a tick label that would overlap the next one is left out", () => {
    const data = list([], {
      today: "2026-11-28",
      forecast: forecast({ deadline: null, finish: "2027-02-10", epics: [forecastEpic("e", { planned_start: "2026-11-28", planned_end: "2027-02-10" })] }),
    });
    show(data);
    const header = screen.getByTestId("axis-header");
    expect(within(header).queryByText("Nov 2026")).not.toBeInTheDocument(); // 3 days (18px) before Dec
    expect(within(header).getByText("Dec")).toBeInTheDocument();
    expect(within(header).getByText("Jan 2027")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-037 Show closed is off by default: no closed milestone, no closed epic", () => {
    const data = list([entry("m0", { title: "Zero", status: "closed" })], { closed_epics: [closedEpic("c1")], forecast: forecast({ epics: [forecastEpic("e")] }) });
    const { onShowClosed } = show(data);
    expect(screen.queryByRole("link", { name: "Zero" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Title c1" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Show closed" })).not.toBeChecked();
    expect(onShowClosed).not.toHaveBeenCalled();
  });

  it("REQ-MILESTONE-UI-037 the checkbox asks to show closed", async () => {
    const { onShowClosed } = show(list([]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Show closed" }));
    expect(onShowClosed).toHaveBeenCalledWith(true);
  });

  it("REQ-MILESTONE-UI-037 Show closed adds the closed milestones with Finished and the closed epics in the Done style under theirs", () => {
    const data = list(
      [
        entry("ex-m1", { title: "Foundations", status: "closed", start: "2026-10-01", end: "2026-10-31", finish: "2026-10-13" }),
        entry("ex-m2", { title: "Payments", status: "active", start: "2026-11-02", end: "2026-12-04" }),
      ],
      {
        today: "2026-11-26",
        forecast: forecast({ epics: [forecastEpic("open-1", { milestone: "ex-m1" })], milestones: [forecastMilestone("ex-m2")] }),
        closed_epics: [closedEpic("ex-e2", { title: "Ledger", milestone: "ex-m1", start: "2026-10-12", end: "2026-10-28" })],
      },
    );
    show(data, { showClosed: true });
    expect(screen.getByText("Finished 13 Oct")).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["Foundations", "Ledger", "Title open-1", "Payments"]);
    const bar = screen.getByLabelText(/^Ledger: 12 Oct – 28 Oct/);
    expect(bar).toHaveClass("bg-state-done");
  });

  it("REQ-MILESTONE-UI-038 no forecast: No open work to forecast, and the closed milestones once Show closed is on", () => {
    const data = list([entry("m0", { title: "Zero", status: "closed" })], { forecast: null });
    const { rerender, onZoom, onShowClosed } = show(data);
    expect(screen.getByText("No open work to forecast")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Zero" })).not.toBeInTheDocument();
    rerender(<ProjectTimeline project="alpha" list={data} zoom="months" showClosed onZoom={onZoom} onShowClosed={onShowClosed} />);
    expect(screen.getByText("No open work to forecast")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zero" })).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-038 a chained milestone without open epics says so and keeps its window", () => {
    const data = list([entry("ex-m4", { title: "Later", status: "planned", start: "2026-12-01", end: "2026-12-18" })], {
      today: "2026-11-26",
      forecast: forecast({ epics: [], milestones: [forecastMilestone("ex-m4", { start: null, finish: null })] }),
    });
    const { container } = show(data);
    expect(screen.getByText("No open epics")).toBeInTheDocument();
    expect(container.querySelector('[data-bar="milestone"]')).not.toBeNull();
  });

  it("REQ-MILESTONE-UI-038 an assumed estimate has a dashed outline and says so in its name", () => {
    show(withEpics(forecastEpic("ex-e12", { title: "Search", milestone: "ex-m2", estimate_source: "assumed" })));
    const bar = screen.getByLabelText(/^Search: planned .*assumed estimate$/);
    expect(bar).toHaveAttribute("data-assumed");
    expect(bar).toHaveClass("border-dashed");
  });

  it("REQ-MILESTONE-UI-038 a forecast error leaves the milestone bars without overrun and without epic bars", () => {
    const data = withEpics(e13);
    data.forecast = forecast({ ...data.forecast, error: "dependency cycle" });
    const { container } = show(data);
    expect(screen.getByRole("link", { name: "Payments" })).toBeInTheDocument();
    expect(container.querySelector('[data-bar="milestone"]')).not.toBeNull();
    expect(overrunOf(container)).toBeNull();
    expect(screen.queryByRole("link", { name: "Multi-currency pricing" })).not.toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-038 Show closed with the closed epics unreadable says so and still shows the closed milestones", () => {
    const data = list([entry("m0", { title: "Zero", status: "closed" })], { closed_epics: null, forecast: forecast({ epics: [forecastEpic("e")] }) });
    show(data, { showClosed: true });
    expect(screen.getByText("Closed epics unavailable: Beads could not be read")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zero" })).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-038 closed epics unreadable is not mentioned while Show closed is off", () => {
    show(list([], { closed_epics: null, forecast: forecast({ epics: [forecastEpic("e")] }) }));
    expect(screen.queryByText(/Closed epics unavailable/)).not.toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-035 bars take the colour of their state", () => {
    show(withEpics(forecastEpic("a", { title: "Aa", milestone: "ex-m2", status: "in_progress" }), forecastEpic("b", { title: "Bb", milestone: "ex-m2", status: "blocked" })));
    expect(screen.getByLabelText(/^Aa: planned/)).toHaveClass("bg-state-progress");
    expect(screen.getByLabelText(/^Bb: planned/)).toHaveClass("bg-state-blocked");
  });
});
