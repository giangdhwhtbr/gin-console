import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Scope } from "./filters";
import { ScopeSelect } from "./ScopeSelect";
import { teamReport } from "./team/teamFixtures";
import type { TeamMilestone } from "./teamApi";

afterEach(cleanup);

const show = (milestones: readonly TeamMilestone[], scope: Scope = { kind: "milestone", id: "m2" }) => {
  const onChange = vi.fn();
  render(<ScopeSelect milestones={milestones} scope={scope} onChange={onChange} />);
  return onChange;
};
const select = () => screen.getByRole("combobox", { name: "Report scope" });
const groupValues = (name: string) => within(screen.getByRole("group", { name })).getAllByRole("option").map((o) => o.textContent);

describe("ScopeSelect", () => {
  it("REQ-REPORTS-033 lists Active, Planned by start and Closed latest end first, then the three periods", () => {
    const t = teamReport().milestones;
    const more: TeamMilestone[] = [
      ...t,
      { id: "m4", title: "Scheduled early", status: "scheduled", start: "2026-11-16", end: "2026-11-27", closed_on: null },
      { id: "m0", title: "Closed early", status: "closed", start: "2026-09-01", end: "2026-09-30", closed_on: "2026-09-30" },
    ];
    show(more);
    expect(screen.getByText("Every report uses")).toBeInTheDocument();
    expect(groupValues("Active")).toEqual(["Milestone two"]);
    expect(groupValues("Planned")).toEqual(["Scheduled early", "Milestone three"]);
    expect(groupValues("Closed")).toEqual(["Milestone one", "Closed early"]);
    const options = within(select()).getAllByRole("option").map((o) => o.textContent);
    expect(options.slice(-3)).toEqual(["Last 7 days", "Last 30 days", "Last 90 days"]);
    expect(select()).toHaveDisplayValue("Milestone two");
  });

  it("REQ-REPORTS-033 No milestones: only the three periods", () => {
    show([], { kind: "period", days: 30 });
    expect(within(select()).getAllByRole("option").map((o) => o.textContent)).toEqual(["Last 7 days", "Last 30 days", "Last 90 days"]);
    expect(screen.queryByRole("group")).toBeNull();
    expect(select()).toHaveDisplayValue("Last 30 days");
  });

  it("REQ-REPORTS-033 Pick a period, or a milestone", async () => {
    const onChange = show(teamReport().milestones);
    await userEvent.selectOptions(select(), "Last 7 days");
    expect(onChange).toHaveBeenLastCalledWith({ kind: "period", days: 7 });
    await userEvent.selectOptions(select(), "Milestone one");
    expect(onChange).toHaveBeenLastCalledWith({ kind: "milestone", id: "m1" });
  });

  it("REQ-REPORTS-012 REQ-REPORTS-033 long options on a phone: no wider than the panel, cut short with the full title", () => {
    const long = "A".repeat(120);
    show([{ id: "m9", title: long, status: "active", start: "2026-11-02", end: "2026-11-27", closed_on: null }], { kind: "milestone", id: "m9" });
    expect(select()).toHaveClass("max-w-full", "min-w-0", "truncate");
    expect(select().closest("label")).toHaveClass("max-w-full", "min-w-0");
    expect(screen.getByRole("option", { name: long })).toHaveAttribute("title", long);
  });
});
