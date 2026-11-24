import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { milestonePath } from "@/features/milestones/api";
import { parseReportSearch, type ReportFilters } from "../filters";
import { TeamSection } from "./TeamSection";
import { teamReport, teamTotals } from "./teamFixtures";
import type { TeamReport } from "../teamApi";

afterEach(cleanup);

const filters = (over: Partial<ReportFilters> = {}): ReportFilters => ({ ...parseReportSearch("?project=alpha&milestone=m2"), ...over });
function show(report: TeamReport, over: Partial<ReportFilters> = {}, finish: string | null = null) {
  const onChange = vi.fn();
  render(<TeamSection project="alpha" report={report} filters={filters(over)} finish={finish} onChange={onChange} />);
  return onChange;
}

describe("TeamSection", () => {
  it("REQ-REPORTS-012 REQ-REPORTS-033 holds no milestone select: the page's scope select replaces it", () => {
    show(teamReport());
    expect(screen.queryByLabelText("Milestone")).toBeNull();
  });

  it("REQ-REPORTS-012 member select, pick and clear", async () => {
    const onChange = show(teamReport());
    expect(screen.getByRole("option", { name: "All members (2)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ann (4)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unassigned (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear member" })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Member"), "ann");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ member: "ann" }));
  });

  it("REQ-REPORTS-012 Clear member appears with a member", async () => {
    const onChange = show(teamReport(), { member: "ann" });
    await userEvent.click(screen.getByRole("button", { name: "Clear member" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ member: "" }));
  });

  it("REQ-REPORTS-012 milestone line of an active milestone", () => {
    show(teamReport());
    expect(screen.getByText("Active").closest("[data-status]")).toHaveAttribute("data-status", "active");
    expect(screen.getByText("Active").closest("[data-milestone-status]")).toHaveTextContent(/^Active$/);
    expect(screen.getByText("2 Nov – 27 Nov")).toBeInTheDocument();
    expect(screen.getByText("working day 9 of 20, 11 left")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Gantt" })).toHaveAttribute("href", milestonePath("alpha", "m2"));
  });

  it("REQ-REPORTS-012 late active milestone: the chip reads Active, late with a warning mark", () => {
    show(teamReport(), {}, "2027-02-16");
    const chip = screen.getByText("Active").closest("[data-milestone-status]");
    expect(chip).toHaveTextContent("Active, late");
    expect(chip?.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
    cleanup();
    show(teamReport(), {}, "2026-11-27");
    expect(screen.getByText("Active").closest("[data-milestone-status]")).toHaveTextContent(/^Active$/);
  });

  it("REQ-REPORTS-012 an active milestone past its end is late without a forecast", () => {
    show(teamReport({ today: "2026-11-30" }));
    expect(screen.getByText("Active").closest("[data-milestone-status]")).toHaveTextContent("Active, late");
  });

  it("REQ-REPORTS-012 milestone line of a closed milestone", () => {
    show(teamReport({ milestone: "m1" }));
    expect(screen.getByText("Closed, 2 d late")).toBeInTheDocument();
    expect(screen.getByText("finished 3 Nov")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-023 a closed milestone closed on the weekend after its end reads on time", () => {
    const t = teamReport({ milestone: "m1" });
    show({ ...t, milestones: t.milestones.map((m) => (m.id === "m1" ? { ...m, end: "2026-10-30", closed_on: "2026-10-31" } : m)) });
    expect(screen.getByText("Closed, on time")).toBeInTheDocument();
  });

  it("REQ-REPORTS-012 milestone line of a planned milestone", () => {
    show(teamReport({ milestone: "m3" }));
    expect(screen.getByText("Planned").closest("[data-milestone-status]")).toHaveTextContent(/^Planned$/);
    expect(screen.getByText("starts in 12 working days")).toBeInTheDocument();
  });

  it("REQ-REPORTS-012 undated milestones note", () => {
    show(teamReport({ undated: 2 }));
    expect(screen.getByText("2 milestones without start and end dates are not listed")).toBeInTheDocument();
  });

  it("REQ-REPORTS-012 offers no period or sprint choice", () => {
    show(teamReport());
    expect(screen.queryByRole("button", { name: "7 days" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Sprint" })).toBeNull();
  });

  it("REQ-REPORTS-012 the bead list defaults to Open for an open milestone and Closed for a closed one", () => {
    show(teamReport(), { status: "" });
    expect(screen.getByRole("tab", { name: /^Open/ })).toHaveAttribute("aria-selected", "true");
    cleanup();
    show(teamReport({ milestone: "m1" }), { scope: { kind: "milestone", id: "m1" }, status: "" });
    expect(screen.getByRole("tab", { name: /^Closed/ })).toHaveAttribute("aria-selected", "true");
  });

  // a period has no end date, so no bead has `late_days`
  const period = (over: Partial<TeamReport> = {}) =>
    teamReport({
      milestone: null,
      period_days: 30,
      team: { ...teamTotals, working_days: null, elapsed: null, days_left: null, pace_needed: null, on_time: null },
      beads: teamReport().beads.map((b) => ({ ...b, late_days: null })),
      ...over,
    });

  it("REQ-REPORTS-012 period: the scope line names the days, and no Open Gantt link", () => {
    show(period(), { scope: { kind: "period", days: 30 } });
    expect(screen.getByRole("heading", { name: "Last 30 days, 13 Oct – 12 Nov" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Gantt" })).toBeNull();
    expect(screen.getByRole("group", { name: "Key figures" })).toHaveTextContent("Throughput");
    expect(screen.getByRole("tab", { name: /^Closed/ })).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-REPORTS-012 period: closed beads have no on-time verdict, and an empty list names the scope", () => {
    show(period(), { scope: { kind: "period", days: 30 } });
    const closedRow = screen.getAllByRole("row").find((r) => r.textContent?.includes("a-3"));
    expect(closedRow).toBeDefined();
    expect(closedRow).not.toHaveTextContent("On time");
    expect(closedRow).toHaveTextContent("—");
    cleanup();
    show(period({ beads: [] }), { scope: { kind: "period", days: 30 } });
    expect(screen.getByText("No closed beads in this scope")).toBeInTheDocument();
    cleanup();
    show(teamReport({ beads: [] }), { status: "closed" });
    expect(screen.getByText("No closed beads in this milestone")).toBeInTheDocument();
  });

  it("REQ-REPORTS-017 no milestones: shows the last 30 days, not a milestone", () => {
    show(period({ milestones: [] }), { scope: { kind: "period", days: 30 } });
    expect(screen.getByRole("heading", { name: "Last 30 days, 13 Oct – 12 Nov" })).toBeInTheDocument();
    expect(screen.queryByText(/has no milestones yet/)).toBeNull();
    expect(screen.queryByText("gin milestone create")).toBeNull();
  });
});
