import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MilestoneDetail } from "./api";
import { GanttChart } from "./GanttChart";
import type { Zoom } from "./gantt";
import { detail, epicPlan } from "./milestoneFixtures";

afterEach(cleanup);

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

describe("GanttChart", () => {
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
});
