import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MilestoneOption } from "./api";
import { MilestoneFilter } from "./MilestoneFilter";

afterEach(cleanup);

const option = (id: string, status: MilestoneOption["status"], start: string, end: string): MilestoneOption => ({
  id,
  title: `Title ${id}`,
  status,
  start,
  end,
});
const data = {
  milestones: [
    option("c1", "closed", "2026-01-01", "2026-02-01"),
    option("c2", "closed", "2026-03-01", "2026-04-01"),
    option("p2", "planned", "2026-08-01", "2026-09-01"),
    option("p1", "scheduled", "2026-07-01", "2026-08-01"),
    option("a1", "active", "2026-05-01", "2026-06-01"),
  ],
  current: "a1",
};

const labelsOf = (group: HTMLElement) => within(group).getAllByRole("option").map((o) => o.textContent);

describe("MilestoneFilter", () => {
  it("REQ-UI-104 the select can shrink so a long title never widens the page", () => {
    render(<MilestoneFilter state={{ status: "ok", data }} value="a1" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Milestone" })).toHaveClass("max-w-full");
  });

  it("REQ-UI-104 lists All, No milestone and the Active, Planned and Closed groups", () => {
    render(<MilestoneFilter state={{ status: "ok", data }} value="a1" onChange={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Milestone" });
    expect(select).toHaveValue("a1");
    expect(within(select).getAllByRole("option").slice(0, 2).map((o) => o.textContent)).toEqual([
      "All",
      "No milestone",
    ]);
    expect(labelsOf(within(select).getByRole("group", { name: "Active" }))).toEqual(["Title a1"]);
    expect(labelsOf(within(select).getByRole("group", { name: "Planned" }))).toEqual(["Title p1", "Title p2"]);
    expect(labelsOf(within(select).getByRole("group", { name: "Closed" }))).toEqual(["Title c2", "Title c1"]);
  });

  it("REQ-UI-104 shows Milestones unavailable on error", () => {
    render(<MilestoneFilter state={{ status: "error" }} value="all" onChange={() => {}} />);
    expect(screen.getByRole("option", { name: "Milestones unavailable" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Milestone" })).toBeDisabled();
  });

  it("REQ-UI-104 is disabled while loading", () => {
    render(<MilestoneFilter state={{ status: "loading" }} value="all" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Milestone" })).toBeDisabled();
  });

  it("REQ-UI-104 reports the chosen value", async () => {
    const onChange = vi.fn();
    render(<MilestoneFilter state={{ status: "ok", data }} value="a1" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Milestone" }), "none");
    expect(onChange).toHaveBeenCalledWith("none");
  });
});
