import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { MemberFigures, TeamMilestone, TeamTotals } from "../teamApi";
import { HintProvider } from "@/components/HintProvider";
import { DEFINITIONS } from "@/lib/definitions";
import { TeamFigures } from "./TeamFigures";
import { teamReport, teamTotals } from "./teamFixtures";

afterEach(cleanup);

const report = teamReport();
const active: TeamMilestone = report.milestones[1];
const closed: TeamMilestone = report.milestones[0];
const ann: MemberFigures = report.members[0];

function show(team: Partial<TeamTotals>, milestone = active, member: MemberFigures | null = null) {
  render(<HintProvider><TeamFigures team={{ ...teamTotals, ...team }} member={member} milestone={milestone} /></HintProvider>);
}
const warn = (text: string) => expect(screen.getByText(text)).toHaveClass("text-state-blocked");
// a figure's second line: the span that holds the whole joined text
const line = (text: string) => screen.getByText((_, el) => el?.tagName === "SPAN" && el.classList.contains("text-xs") && el.textContent === text);
const warnLine = (text: string) => expect(line(text)).toHaveClass("text-state-blocked");

describe("TeamFigures", () => {
  it("REQ-REPORTS-013 REQ-UI-132 the Open figure has a hint naming the blocked rule", async () => {
    const user = userEvent.setup();
    show({ open: 5, blocked: 2 });
    const open = screen.getByText("5", { selector: "span.text-2xl" });
    expect(open).toHaveAttribute("tabindex", "0");
    await user.tab();
    await user.tab();
    await user.tab();
    expect(open).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(DEFINITIONS.blocked);
  });

  it("REQ-REPORTS-013 behind pace", () => {
    show({ pace: 2, pace_needed: 3.4 });
    warn("2.0 / day");
    warnLine("needs 3.4 / day to end on 27 Nov");
  });

  it("REQ-REPORTS-013 on pace is not a warning", () => {
    show({ pace: 3.6, pace_needed: 3.4 });
    expect(screen.getByText("3.6 / day")).not.toHaveClass("text-state-blocked");
  });

  it("REQ-REPORTS-013 member figures", () => {
    show({}, active, { ...ann, scope: 11, closed: 6, done: 6 / 11, blocked: 1 });
    expect(screen.getByText("6 / 11")).toBeInTheDocument();
    expect(screen.getByText("55% of assigned")).toBeInTheDocument();
    expect(line("1 blocked")).toBeInTheDocument();
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
    warnLine("oldest 4.9 d");
    warnLine("3 blocked · 8 unclaimed");
    warnLine("4 still open after end");
  });

  it("REQ-REPORTS-013 quiet figures", () => {
    show({ oldest_in_progress: null, blocked: 0, late_open: 0, cycle_median: null, rework_rate: null });
    expect(screen.getByText("nothing started")).toBeInTheDocument();
    expect(line("closed by 27 Nov")).not.toHaveClass("text-state-blocked");
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

  it("REQ-UI-110 Facts as label and value: joined figures keep their text with strong numbers", () => {
    show({ blocked: 2, unclaimed: 1 });
    const strip = screen.getByRole("group", { name: "Key figures" });
    expect(strip).toHaveTextContent("2 blocked · 1 unclaimed");
    expect(line("2 blocked · 1 unclaimed").querySelectorAll("b")).toHaveLength(2);
    expect(screen.getByText("Done")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("1 / 4")).toHaveClass("font-semibold");
  });

  it("REQ-UI-110 Contrast: the milestone aside is not faded with an opacity class", () => {
    show({ pace: 2, pace_needed: 3.4 });
    expect(screen.getByText("last 5 days").className).not.toMatch(/opacity-/);
  });
});
