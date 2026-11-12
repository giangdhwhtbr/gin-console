import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DayRow } from "../teamApi";
import { ClosedPerDayChart } from "./ClosedPerDayChart";
import { teamReport } from "./teamFixtures";

afterEach(cleanup);

const [closedMilestone, active, planned] = teamReport().milestones;
const days: DayRow[] = [
  { date: "2026-11-03", closed: {} },
  { date: "2026-11-04", closed: { ann: 2, bao: 1 } },
  { date: "2026-11-05", closed: { ann: 1 } },
];
const base = { days, members: ["ann", "bao"], selected: "", today: "2026-11-12", milestone: active };

describe("ClosedPerDayChart", () => {
  it("REQ-REPORTS-014 stacked day", () => {
    render(<ClosedPerDayChart {...base} />);
    const column = screen.getByLabelText("4 Nov: ann 2, bao 1, total 3");
    expect(column.tagName).toBe("LI");
    expect(column).toHaveAttribute("tabindex", "0");
    const tip = within(column).getByRole("tooltip");
    for (const line of ["4 Nov", "ann 2", "bao 1", "total 3"]) expect(within(tip).getByText(line)).toBeInTheDocument();
  });

  it("REQ-REPORTS-014 not started", () => {
    const { container } = render(<ClosedPerDayChart {...base} milestone={planned} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-REPORTS-014 markers", () => {
    const todayDays = [...days, { date: "2026-11-12", closed: {} }];
    const { unmount } = render(<ClosedPerDayChart {...base} days={todayDays} />);
    expect(screen.getByText("Today").closest("li")).toHaveAttribute("aria-label", expect.stringContaining("12 Nov"));
    expect(screen.queryByText(/^End /)).toBeNull();
    unmount();
    const past: DayRow[] = [{ date: "2026-10-30", closed: {} }, { date: "2026-11-02", closed: { ann: 1 } }];
    render(<ClosedPerDayChart {...base} days={past} milestone={closedMilestone} />);
    expect(screen.getByText("End 30 Oct").closest("li")).toHaveAttribute("aria-label", expect.stringContaining("30 Oct"));
    expect(screen.queryByText("Today")).toBeNull();
  });

  it("REQ-REPORTS-014 faded", () => {
    render(<ClosedPerDayChart {...base} selected="ann" />);
    const column = screen.getByLabelText("4 Nov: ann 2, bao 1, total 3");
    const segments = Array.from(column.querySelectorAll<HTMLElement>("[aria-hidden] > span"));
    const colors = segments.map((s) => [s.style.background, s.classList.contains("opacity-20")]);
    expect(colors).toEqual([
      ["var(--series-1)", false],
      ["var(--series-2)", true],
    ]);
  });

  it("REQ-REPORTS-014 legend", () => {
    render(<ClosedPerDayChart {...base} members={["bao", "cy", "ann"]} />);
    const items = screen.getAllByRole("listitem").filter((li) => !li.hasAttribute("tabindex"));
    expect(items.map((li) => li.textContent)).toEqual(["bao", "ann"]);
  });

  it("REQ-REPORTS-014 future days have no segments", () => {
    render(<ClosedPerDayChart {...base} today="2026-11-04" days={days} />);
    const future = screen.getByLabelText("5 Nov: ann 1, total 1");
    expect(future.querySelectorAll("[aria-hidden] > span")).toHaveLength(1);
    expect(future.querySelector("[aria-hidden] > span")).toHaveClass("h-0.5");
  });
});
