import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemberFigures } from "../teamApi";
import { MemberTable } from "./MemberTable";
import { teamReport } from "./teamFixtures";

afterEach(cleanup);

const [first, second] = teamReport().members;
const members: MemberFigures[] = [
  { ...first, scope: 11, closed: 6, in_progress: 1, open: 4, blocked: 1, done: 0.55, throughput: 4, cycle_median: 1.1, oldest_in_progress: 4.9, on_time: 1, rework_rate: 0.1 },
  { ...second, rework_rate: null, oldest_in_progress: 2 },
];
function show(selected = "") {
  const onSelect = vi.fn();
  render(<MemberTable members={members} selected={selected} onSelect={onSelect} />);
  return onSelect;
}
const row = (name: string) => screen.getByRole("row", { name: new RegExp(`^${name}`) });

describe("MemberTable", () => {
  it("REQ-REPORTS-015 columns", () => {
    show();
    const cells = within(row("ann")).getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["ann", "11", "6", "1", "4(1 blocked)", "55%", "4.0", "1.1 d", "4.9 d", "100%", "10%"]);
    expect(cells[8]).toHaveClass("text-state-blocked");
    const un = within(row("Unassigned")).getAllByRole("cell");
    expect(un[8]).not.toHaveClass("text-state-blocked");
    expect(un[10]).toHaveTextContent("—");
  });

  it("REQ-REPORTS-015 filter from the table", async () => {
    const onSelect = show();
    await userEvent.click(row("ann"));
    expect(onSelect).toHaveBeenLastCalledWith("ann");
    row("Unassigned").focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("Unassigned");
    await userEvent.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it("REQ-REPORTS-015 clear from the table", async () => {
    const onSelect = show("ann");
    expect(row("ann")).toHaveAttribute("aria-selected", "true");
    expect(row("ann")).toHaveClass("bg-muted");
    expect(row("Unassigned")).toHaveAttribute("aria-selected", "false");
    await userEvent.click(row("ann"));
    expect(onSelect).toHaveBeenCalledWith("");
  });
});
