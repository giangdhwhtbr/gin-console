import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MemberFigures, TeamMilestone, TeamTotals } from "../teamApi";
import { TeamFigures } from "./TeamFigures";
import { teamReport, teamTotals } from "./teamFixtures";

afterEach(cleanup);

const report = teamReport();
const active: TeamMilestone = report.milestones[1];
const closed: TeamMilestone = report.milestones[0];
const ann: MemberFigures = report.members[0];

function show(team: Partial<TeamTotals>, milestone = active, member: MemberFigures | null = null) {
  render(<TeamFigures team={{ ...teamTotals, ...team }} member={member} milestone={milestone} />);
}
const warn = (text: string) => expect(screen.getByText(text)).toHaveClass("text-state-blocked");

describe("TeamFigures", () => {
  it("REQ-REPORTS-013 behind pace", () => {
    show({ pace: 2, pace_needed: 3.4 });
    warn("2.0 / day");
    warn("needs 3.4 / day to end on 27 Nov");
  });

  it("REQ-REPORTS-013 on pace is not a warning", () => {
    show({ pace: 3.6, pace_needed: 3.4 });
    expect(screen.getByText("3.6 / day")).not.toHaveClass("text-state-blocked");
  });

  it("REQ-REPORTS-013 member figures", () => {
    show({}, active, { ...ann, scope: 11, closed: 6, done: 6 / 11, blocked: 1 });
    expect(screen.getByText("6 / 11")).toBeInTheDocument();
    expect(screen.getByText("55% of assigned")).toBeInTheDocument();
    expect(screen.getByText("1 blocked")).toBeInTheDocument();
    expect(screen.getByText("Throughput")).toBeInTheDocument();
    expect(screen.queryByText("Pace")).toBeNull();
  });

  it("REQ-REPORTS-013 closed milestone", () => {
    show({ pace_needed: null, throughput: 13.2, on_time: 0.88 }, closed);
    expect(screen.getByText("13.2 / week")).toBeInTheDocument();
    warn("88%");
  });

  it("REQ-REPORTS-013 in progress and open", () => {
    show({ oldest_in_progress: 4.9, blocked: 3, unclaimed: 8, late_open: 4 });
    warn("oldest 4.9 d");
    warn("3 blocked · 8 unclaimed");
    warn("4 still open after end");
  });

  it("REQ-REPORTS-013 quiet figures", () => {
    show({ oldest_in_progress: null, blocked: 0, late_open: 0, cycle_median: null, rework_rate: null });
    expect(screen.getByText("nothing started")).toBeInTheDocument();
    expect(screen.getByText("closed by 27 Nov")).not.toHaveClass("text-state-blocked");
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("REQ-REPORTS-013 scope bar", () => {
    show({ scope: 64, closed: 27, in_progress: 10, open: 27, blocked: 3 });
    const bar = screen.getByRole("img", { name: "27 closed, 10 in progress, 24 open, 3 blocked" });
    expect(bar.children).toHaveLength(4);
    expect(screen.getByText("Scope by status")).toBeInTheDocument();
    for (const name of ["Closed", "In progress", "Open", "Blocked"]) {
      expect(screen.getByText(name, { selector: "li" })).toBeInTheDocument();
    }
  });
});
