import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ForecastEpic } from "@/features/milestones/api";
import { detail, epicPlan, forecastEpic } from "@/features/milestones/milestoneFixtures";
import { EpicTable } from "./EpicTable";
import { statusEpic } from "./statusFixtures";

afterEach(cleanup);

describe("EpicTable", () => {
  it("REQ-REPORTS-031 Open and closed epics: shows link, verdict, strand, planned, forecast and owner", () => {
    const epics = [
      statusEpic("e-3", { title: "Cart totals", status: "closed", person: "ann", closed_on: "2026-11-20", child_counts: { total: 2, closed: 2, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 } }),
      statusEpic("e-1", { title: "Team checkout", status: "in_progress", person: "lead", closed_on: null, child_counts: { total: 4, closed: 2, in_progress: 1, blocked: 0, ready: 1, deferred: 0, prep_total: 0, prep_closed: 0 } }),
    ];
    const plan = detail([
      epicPlan("e-1", {
        title: "Team checkout",
        planned_start: "2026-11-11",
        planned_end: "2026-11-20",
        warnings: [{ code: "late", days: 3, count: null }],
      }),
      epicPlan("e-3", { title: "Cart totals", status: "closed", planned_start: "2026-11-12", planned_end: "2026-11-19" }),
    ]);
    const forecast: ForecastEpic[] = [
      forecastEpic("e-1", { milestone: "m2", planned_start: "2026-11-23", planned_end: "2026-11-25", estimate_source: "points" }),
    ];

    render(<EpicTable project="example" epics={epics} detail={plan} forecast={forecast} today="2026-11-23" />);
    expect(screen.getByRole("heading", { name: "Epics" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    // Ordered by planned_start: e-1 (11 Nov) before e-3 (12 Nov)
    expect(rows).toHaveLength(2);
    const e1 = within(rows[0]);
    const link = e1.getByRole("link", { name: "Team checkout" });
    expect(link).toHaveAttribute("href", "/beads/example/e-1");
    expect(link).toHaveAttribute("title", "Team checkout");
    expect(rows[0].querySelector("[data-glyph='blocked']")).not.toBeNull();
    expect(e1.getByText("Late: should have finished 20 Nov")).toBeInTheDocument();
    expect(e1.getByText("11 Nov – 20 Nov")).toBeInTheDocument();
    expect(e1.getByText("25 Nov")).toBeInTheDocument();
    expect(e1.getByText("lead")).toBeInTheDocument();

    const e3 = within(rows[1]);
    expect(e3.getByText("Done")).toBeInTheDocument();
    expect(rows[1].querySelector("[data-glyph='done']")).not.toBeNull();
    expect(e3.getByText("20 Nov")).toBeInTheDocument();
  });

  it("REQ-REPORTS-031 Not split and assumed: shows Not split yet, ? on assumed forecast and Unassigned", () => {
    const epics = [
      statusEpic("e-5", {
        title: "Loyalty points",
        status: "open",
        person: "Unassigned",
        child_counts: { total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 },
      }),
    ];
    const forecast: ForecastEpic[] = [
      forecastEpic("e-5", { milestone: "m2", planned_start: "2026-12-23", planned_end: "2027-01-01", estimate_source: "assumed" }),
    ];
    render(<EpicTable project="example" epics={epics} detail={null} forecast={forecast} today="2026-11-23" />);
    expect(screen.getByText("Not split yet")).toBeInTheDocument();
    expect(screen.getByText("1 Jan 2027?")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("REQ-REPORTS-031 Detail failed: open epics read — for Verdict, Planned and Forecast, ordered by id", () => {
    const epics = [
      statusEpic("e-9", { title: "Zeta", status: "open" }),
      statusEpic("e-2", { title: "Alpha", status: "open" }),
    ];
    const { container } = render(<EpicTable project="example" epics={epics} detail={null} forecast={null} today="2026-11-23" />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getByRole("link").textContent)).toEqual(["Alpha", "Zeta"]);
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell");
      expect(cells[1].textContent).toBe("—"); // Verdict
      expect(cells[3].textContent).toBe("—"); // Planned
      expect(cells[4].textContent).toBe("—"); // Forecast
    }
    // Table scrolls sideways inside its container
    expect(container.querySelector("[data-slot='table-container']")).toHaveClass("overflow-x-auto");
  });
});
