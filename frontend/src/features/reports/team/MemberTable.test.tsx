import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemberFigures } from "../teamApi";
import { MemberTable } from "./MemberTable";
import { teamReport } from "./teamFixtures";

afterEach(cleanup);

const [first, second] = teamReport().members;
const members: MemberFigures[] = [
  { ...first, scope: 11, closed: 6, in_progress: 1, open: 4, blocked: 1, done: 0.55, points_delivered: 6, throughput: 4, cycle_median: 1.1, oldest_in_progress: 4.9, on_time: 1, accuracy: 0.9, rework_rate: 0.1 },
  { ...second, points_delivered: 2, accuracy: null, rework_rate: null, oldest_in_progress: 2 },
];
function show(selected = "", list: MemberFigures[] = members) {
  const onSelect = vi.fn();
  render(<MemberTable members={list} selected={selected} onSelect={onSelect} />);
  return onSelect;
}
const row = (name: string) => screen.getByRole("row", { name: new RegExp(`^${name}`) });

describe("MemberTable", () => {
  it("REQ-REPORTS-015 columns", () => {
    show();
    const cells = within(row("ann")).getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual(["ann", "11", "6", "1", "4(1 blocked)", "55%", "6", "4.0", "1.1 d", "4.9 d", "100%", "0.90", "10%"]);
    expect(cells[9]).toHaveClass("text-state-blocked");
    const un = within(row("Unassigned")).getAllByRole("cell");
    expect(un[9]).not.toHaveClass("text-state-blocked");
    expect(un[11]).toHaveTextContent("—");
    expect(un[12]).toHaveTextContent("—");
  });

  it("REQ-REPORTS-015 points and accuracy columns", () => {
    show("", [
      { ...first, member: "ann", points_delivered: 6, accuracy: 0.9 },
      { ...first, member: "bao", points_delivered: 2, accuracy: null },
    ]);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual(["ann", "bao"]);
    const annCells = within(rows[0]).getAllByRole("cell");
    expect(annCells[6]).toHaveTextContent("6");
    expect(annCells[11]).toHaveTextContent("0.90");
    const baoCells = within(rows[1]).getAllByRole("cell");
    expect(baoCells[6]).toHaveTextContent("2");
    expect(baoCells[11]).toHaveTextContent("—");
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
