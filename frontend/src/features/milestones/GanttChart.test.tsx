import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MilestoneDetail } from "./api";
import { GanttChart } from "./GanttChart";
import type { Zoom } from "./gantt";
import { bead } from "@/features/beads/beadFixtures";
import type { BeadSummary } from "@/features/beads/api";
import { detail, epicPlan } from "./milestoneFixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const draw = (plan: MilestoneDetail, zoom: Zoom = "all") =>
  render(<GanttChart project="alpha" plan={plan} preview={false} zoom={zoom} onZoom={vi.fn()} childBeads={new Map()} />);
const scroller = () => document.querySelector<HTMLElement>("[data-scroller]") ?? document.body;
const range = () => document.querySelector("[data-range]")?.textContent;
const arrow = (from: string, to: string) => document.querySelector<SVGPathElement>(`path[data-from="${from}"][data-to="${to}"]`);
const epicRow = (id: string) => document.querySelector<HTMLElement>(`[data-epic="${id}"]`) ?? document.body;

const MONTH = detail([epicPlan("e-a", { planned_start: "2026-11-02", planned_end: "2026-11-27", estimate_days: 20 })], {
  end: "2026-11-27",
  finish: "2026-11-27",
});

const drawKids = (kids: Record<string, BeadSummary[]>) =>
  render(<GanttChart project="alpha" plan={detail([epicPlan("e-a"), epicPlan("e-b")])} preview={false} zoom="all" onZoom={vi.fn()} childBeads={new Map(Object.entries(kids))} />);
const track = (id: string, status = "open") => bead(id, { parent: "e-a", status, labels: ["track:1"] });
const prep = (id: string, status = "open") => bead(id, { parent: "e-a", status, labels: ["prep"] });

describe("GanttChart", () => {
  it("REQ-MILESTONE-UI-015 tracks and prep counted apart; prep rows carry a Prep chip", async () => {
    drawKids({ "e-a": [track("e-a.1", "closed"), track("e-a.2"), prep("e-a.3", "closed"), prep("e-a.4")] });
    expect(epicRow("e-a")).toHaveTextContent("1/2 closed");
    expect(epicRow("e-a")).toHaveTextContent("Prep 1/2");
    await userEvent.click(screen.getByRole("button", { name: /child beads of e-a/ }));
    const rows = [...document.querySelectorAll<HTMLElement>("[data-child]")];
    expect(rows.map((r) => r.dataset.child)).toEqual(["e-a.1", "e-a.2", "e-a.3", "e-a.4"]);
    expect(rows.map((r) => r.textContent?.includes("Prep"))).toEqual([false, false, true, true]);
  });

  it("REQ-MILESTONE-UI-015 an epic with only prep tasks: expand button, Prep x/y, no closed count", () => {
    drawKids({ "e-a": [prep("e-a.1", "closed"), prep("e-a.2")] });
    expect(screen.getByRole("button", { name: /child beads of e-a/ })).toBeInTheDocument();
    expect(epicRow("e-a")).toHaveTextContent("Prep 1/2");
    expect(epicRow("e-a")).not.toHaveTextContent("closed");
  });

  it("REQ-MILESTONE-UI-003 the epic row shows spec readiness: confirmed, missing, or nothing when unknown", () => {
    draw(detail([epicPlan("e-a", { spec_confirmed: true }), epicPlan("e-b", { spec_confirmed: false }), epicPlan("e-c")]));
    expect(epicRow("e-a")).toHaveTextContent("Spec confirmed");
    expect(epicRow("e-a")).not.toHaveTextContent("No confirmed spec");
    expect(epicRow("e-b")).toHaveTextContent("No confirmed spec");
    expect(epicRow("e-c")).not.toHaveTextContent(/spec/i);
  });

  it("REQ-MILESTONE-UI-011 today outside the plan: one week opens on the Monday of the plan's first day", () => {
    draw(
      detail([epicPlan("e-a", { planned_start: "2026-11-04", planned_end: "2026-11-06" })], {
        start: "2026-11-04",
        schedule_start: "2026-11-04",
        finish: "2026-11-06",
        today: "2026-10-29",
      }),
      "1w",
    );
    expect(range()).toBe("2 Nov – 8 Nov");
  });

  it("REQ-MILESTONE-UI-012 › steps to the next Monday; ‹ disabled at the start", async () => {
    draw(MONTH, "2w");
    expect(range()).toBe("2 Nov – 15 Nov");
    expect(screen.getByRole("button", { name: "Earlier" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(range()).toBe("16 Nov – 29 Nov");
    expect(screen.getByRole("button", { name: "Later" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Earlier" }));
    expect(range()).toBe("2 Nov – 15 Nov");
  });

  it("REQ-MILESTONE-UI-012 dragging moves the days in view and does not open the link under it", () => {
    draw(MONTH, "1w");
    const el = scroller();
    Object.defineProperty(el, "scrollWidth", { value: 3000 });
    Object.defineProperty(el, "clientWidth", { value: 960 });
    const link = screen.getByRole("link", { name: "e-a" });
    const before = window.location.pathname;
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0, clientX: 700 });
    fireEvent.pointerMove(link, { pointerType: "mouse", clientX: 40 });
    fireEvent.pointerUp(link, { pointerType: "mouse", clientX: 40 });
    fireEvent.click(link);
    expect(window.location.pathname).toBe(before);
    expect(el.scrollLeft).toBe(660);
    fireEvent.scroll(el);
    expect(range()).toBe("9 Nov – 15 Nov");
  });

  it("REQ-MILESTONE-UI-012 a move under 4 px is a click", () => {
    window.history.replaceState(null, "", "/milestones/alpha/m-1");
    draw(MONTH, "1w");
    const el = scroller();
    Object.defineProperty(el, "scrollWidth", { value: 3000 });
    Object.defineProperty(el, "clientWidth", { value: 960 });
    const link = screen.getByRole("link", { name: "e-a" });
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0, clientX: 700 });
    fireEvent.pointerMove(link, { pointerType: "mouse", clientX: 697 });
    fireEvent.pointerUp(link, { pointerType: "mouse", clientX: 697 });
    fireEvent.click(link);
    expect(window.location.pathname).toBe("/beads/alpha/e-a");
    expect(el.scrollLeft).toBe(0);
  });

  it("REQ-MILESTONE-UI-013 title line, then id, period and estimate; the title after a short bar", () => {
    const title = "Process hygiene: consistent skills, rules that bind where it matters";
    draw(detail([epicPlan("gin-workflow-rm-process-hygiene", { title, planned_start: "2026-11-02", planned_end: "2026-11-02", estimate_days: 1 })]));
    const li = epicRow("gin-workflow-rm-process-hygiene");
    const [first, second] = li.querySelectorAll(":scope > div > div > span");
    expect(first).toHaveTextContent(title);
    expect(first.querySelector(`[title="${title}"]`)).toHaveClass("truncate");
    expect(second).toHaveTextContent("gin-workflow-rm-process-hygiene2 Nov, 1d");
    expect(second).toHaveClass("whitespace-nowrap");
    expect([...second.children].every((part) => part.classList.contains("truncate"))).toBe(true);
    expect(li.querySelector("[data-tail]")).toHaveTextContent(title);
  });

  it("REQ-MILESTONE-UI-013 long id: the meta line wraps below lg, its spans carry a title, the id is shortened", () => {
    const id = "gin-workflow-rm-process-hygiene-and-more-things";
    draw(detail([epicPlan(id, { planned_start: "2026-11-02", planned_end: "2026-11-02", estimate_days: 1 })]));
    const meta = epicRow(id).querySelector<HTMLElement>(":scope > div > div > span:nth-child(2)");
    expect(meta).toHaveClass("flex-wrap", "lg:flex-nowrap");
    const [idLabel, period] = Array.from(meta?.children ?? []);
    expect(period).toHaveAttribute("title", "2 Nov, 1d");
    expect(period).toHaveClass("shrink-0");
    expect(idLabel).toHaveAttribute("title", id);
    expect(idLabel).toHaveTextContent("gin-workflow-r…re-things");
    expect(screen.getByRole("link", { name: id })).toHaveAttribute("href", `/beads/alpha/${id}`);
  });

  it("REQ-MILESTONE-UI-013 below lg the rows grow so that wrapped labels do not overlap the next row; warning text has a tooltip", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    draw(
      detail([
        epicPlan("e-a", { spec_confirmed: false, warnings: [{ code: "late", days: null, count: null }] }),
        epicPlan("e-b", { spec_confirmed: true }),
        epicPlan("e-c"),
      ]),
    );
    const rows = ["e-a", "e-b", "e-c"].map((id) => epicRow(id));
    // rows stack in flow: their heights are their tops (jsdom has no layout)
    expect(rows.map((row) => row.style.height)).toEqual(["106px", "88px", "72px"]);
    const warning = within(rows[0]).getByText(/^Late: should have finished/);
    expect(warning).toHaveAttribute("title", warning.textContent);
  });

  it("REQ-MILESTONE-UI-013 points", () => {
    draw(
      detail([
        epicPlan("e-c", { points: 5, estimate_days: 7 }),
        epicPlan("e-d", { status: "in_progress", points: 3, estimate_days: 4, remaining_days: 1 }),
        epicPlan("e-e", { estimate_days: 2 }),
      ]),
    );
    expect(epicRow("e-c")).toHaveTextContent("5 pt · 7d");
    expect(epicRow("e-d")).toHaveTextContent("3 pt · 1d left");
    expect(epicRow("e-e")).not.toHaveTextContent("pt");
  });

  it("REQ-MILESTONE-UI-013 remaining and assumed days", () => {
    draw(
      detail([
        epicPlan("e-a", { status: "in_progress", estimate_days: 5, remaining_days: 2 }),
        epicPlan("e-b", { estimate_days: null, assumed_days: 3 }),
        epicPlan("e-c", { status: "in_progress", estimate_days: 5, remaining_days: 5 }),
      ]),
    );
    expect(epicRow("e-a")).toHaveTextContent("2d left");
    expect(epicRow("e-b")).toHaveTextContent("assumed 3d");
    expect(epicRow("e-c")).toHaveTextContent("5d");
    expect(epicRow("e-c")).not.toHaveTextContent("left");
  });

  it("REQ-MILESTONE-UI-003 newer warnings name the integration date", () => {
    draw(detail([epicPlan("e-a", { warnings: [{ code: "after_integration", days: null, count: null }] })], { integration: "2026-11-24" }));
    expect(epicRow("e-a")).toHaveTextContent("Ends after integration on 24 Nov");
  });

  it("REQ-MILESTONE-UI-013 no title after a bar that reaches the end", () => {
    draw(MONTH);
    expect(epicRow("e-a").querySelector("[data-tail]")).toBeNull();
  });

  const CHAIN = detail([
    epicPlan("A", { planned_start: "2026-11-02", planned_end: "2026-11-02" }),
    epicPlan("B", { planned_start: "2026-11-03", planned_end: "2026-11-03", depends_on: ["A", "X"] }),
    epicPlan("C", { planned_start: "2026-11-04", planned_end: "2026-11-05", depends_on: ["B"] }),
    epicPlan("D", { planned_start: "2026-11-05", planned_end: "2026-11-05", depends_on: ["C"] }),
    epicPlan("E", { planned_start: "2026-11-09", planned_end: "2026-11-09" }),
  ]);

  it("REQ-MILESTONE-UI-014 an arrow per in-milestone dependency; late ones in the blocked color", () => {
    draw(CHAIN);
    expect([...document.querySelectorAll("path[data-from]")].map((p) => `${p.getAttribute("data-from")}>${p.getAttribute("data-to")}`)).toEqual([
      "A>B",
      "B>C",
      "C>D",
    ]);
    expect(arrow("A", "B")).not.toHaveAttribute("data-late");
    expect(arrow("C", "D")).toHaveAttribute("data-late", "true");
    expect(arrow("C", "D")).toHaveClass("text-state-blocked");
    expect(document.querySelector('path[data-from="X"]')).toBeNull();
  });

  it("REQ-MILESTONE-UI-014 pointing at an epic highlights its chain and fades the rest", () => {
    draw(CHAIN);
    fireEvent.mouseEnter(epicRow("B"));
    expect(["A", "B", "C", "D"].map((id) => epicRow(id).hasAttribute("data-faded"))).toEqual([false, false, false, false]);
    expect(epicRow("E")).toHaveAttribute("data-faded", "true");
    expect(arrow("A", "B")).toHaveAttribute("data-state", "hot");
    fireEvent.mouseLeave(screen.getByRole("list", { name: "Epics" }));
    expect(epicRow("E")).not.toHaveAttribute("data-faded");
    expect(arrow("A", "B")).not.toHaveAttribute("data-state");
  });

  it("REQ-MILESTONE-UI-014 focus inside a row highlights its chain", () => {
    draw(CHAIN);
    act(() => screen.getByRole("link", { name: "E" }).focus());
    expect(epicRow("A")).toHaveAttribute("data-faded", "true");
    expect(arrow("A", "B")).toHaveAttribute("data-state", "faded");
  });

  it("REQ-UI-109 the epic label shows the Technical badge when its bead has that kind", () => {
    render(
      <GanttChart
        project="alpha"
        plan={detail([epicPlan("e-a"), epicPlan("e-b")])}
        preview={false}
        zoom="all"
        onZoom={vi.fn()}
        childBeads={new Map()}
        kinds={new Map([["e-a", "technical"]])}
      />,
    );
    const row = within(epicRow("e-a"));
    const badge = row.getByText("Technical");
    // on the meta line beside the id, so the title keeps its whole line
    expect(badge.closest("[title='Technical']")?.parentElement).toBe(row.getByTitle("e-a").parentElement);
    expect(row.getByTitle("Title e-a")).not.toContainElement(badge);
    expect(epicRow("e-b")).not.toHaveTextContent("Technical");
  });
});
