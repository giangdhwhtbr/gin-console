import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { milestonePath } from "@/features/milestones/api";
import { parseReportSearch, type ReportFilters } from "../filters";
import { TeamSection } from "./TeamSection";
import { teamReport } from "./teamFixtures";
import type { TeamReport } from "../teamApi";

afterEach(cleanup);

const filters = (over: Partial<ReportFilters> = {}): ReportFilters => ({ ...parseReportSearch("?project=alpha&tab=team"), ...over });
function show(report: TeamReport, over: Partial<ReportFilters> = {}) {
  const onChange = vi.fn();
  render(<TeamSection project="alpha" report={report} filters={filters(over)} onChange={onChange} />);
  return onChange;
}
const optionsOf = (group: string) => within(screen.getByRole("group", { name: group })).getAllByRole("option").map((o) => o.getAttribute("value"));

describe("TeamSection", () => {
  it("REQ-REPORTS-012 milestone select groups Active, Planned and Closed", () => {
    show(teamReport());
    expect(optionsOf("Active")).toEqual(["m2"]);
    expect(optionsOf("Planned")).toEqual(["m3"]);
    expect(optionsOf("Closed")).toEqual(["m1"]);
    expect(screen.getByLabelText("Milestone")).toHaveValue("m2");
  });

  it("REQ-REPORTS-012 member select, pick and clear", async () => {
    const onChange = show(teamReport());
    expect(screen.getByRole("option", { name: "All members (2)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ann · 4" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unassigned · 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear member" })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Member"), "ann");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ member: "ann" }));
  });

  it("REQ-REPORTS-012 Clear member appears with a member", async () => {
    const onChange = show(teamReport(), { member: "ann" });
    await userEvent.click(screen.getByRole("button", { name: "Clear member" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ member: "" }));
  });

  it("REQ-REPORTS-012 a new milestone clears member and status", async () => {
    const onChange = show(teamReport(), { member: "ann", status: "closed" });
    await userEvent.selectOptions(screen.getByLabelText("Milestone"), "m1");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ milestone: "m1", member: "", status: "" }));
  });

  it("REQ-REPORTS-012 milestone line of an active milestone", () => {
    show(teamReport());
    expect(screen.getByText("Active", { selector: "[data-slot=badge]" })).toBeInTheDocument();
    expect(screen.getByText("2 Nov – 27 Nov")).toBeInTheDocument();
    expect(screen.getByText("working day 9 of 20 · 11 left")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Gantt" })).toHaveAttribute("href", milestonePath("alpha", "m2"));
  });

  it("REQ-REPORTS-012 milestone line of a closed milestone", () => {
    show(teamReport({ milestone: "m1" }));
    expect(screen.getByText("Closed · 2 d late")).toBeInTheDocument();
    expect(screen.getByText("finished 3 Nov")).toBeInTheDocument();
  });

  it("REQ-REPORTS-012 milestone line of a planned milestone", () => {
    show(teamReport({ milestone: "m3" }));
    expect(screen.getByText("Planned", { selector: "[data-slot=badge]" })).toBeInTheDocument();
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

  it("REQ-REPORTS-017 no milestones", () => {
    show(teamReport({ milestones: [], milestone: null, team: null, members: [], days: [], beads: [] }));
    expect(screen.getByText("alpha has no milestones yet")).toBeInTheDocument();
    expect(screen.getByText("gin-workflow milestone create")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });
});
