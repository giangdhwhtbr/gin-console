import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeadStatus } from "../filters";
import type { TeamBead } from "../teamApi";
import { BeadTable } from "./BeadTable";
import { teamReport } from "./teamFixtures";

afterEach(cleanup);

const [open, progress, closed] = teamReport().beads;
const make = (base: TeamBead, n: number, over: Partial<TeamBead> = {}): TeamBead => ({ ...base, id: `a-${n}`, title: `Bead ${n}`, ...over });
const many = (base: TeamBead, from: number, count: number) => Array.from({ length: count }, (_, i) => make(base, from + i));
const headers = () => screen.getAllByRole("columnheader").map((h) => h.textContent?.replace(/ [↑↓]$/, ""));

function show(beads: TeamBead[], status: BeadStatus = "open", member = "ann") {
  const onStatus = vi.fn();
  render(<BeadTable project="alpha" beads={beads} member={member} status={status} onStatus={onStatus} today="2026-11-12" />);
  return onStatus;
}

describe("BeadTable", () => {
  it("REQ-REPORTS-016 counts follow the member", async () => {
    const beads = [...many(open, 10, 4), ...many(progress, 20, 1), ...many(closed, 30, 6)];
    const onStatus = show(beads);
    expect(screen.getByRole("heading", { name: "Beads · ann" })).toBeInTheDocument();
    for (const name of ["Open 4", "In progress 1", "Closed 6", "All 11"]) expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Closed 6" }));
    expect(onStatus).toHaveBeenCalledWith("closed");
  });

  it("REQ-REPORTS-016 heading without a member", () => {
    show([open], "open", "");
    expect(screen.getByRole("heading", { name: "Beads" })).toBeInTheDocument();
  });

  it("REQ-REPORTS-016 closed row", () => {
    show([make(closed, 3, { cycle_days: 0.9, late_days: 2, rework: null, epic: { id: "a-e9", title: "Epic nine" } })], "closed");
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("0.9 d")).toBeInTheDocument();
    expect(within(row).getByText("2 d late")).toBeInTheDocument();
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Bead 3" })).toHaveAttribute("href", "/beads/alpha/a-3");
    expect(within(row).getByRole("link", { name: "Epic nine" })).toHaveAttribute("href", "/beads/alpha/a-e9");
    expect(within(row).getByText("10 Nov")).toBeInTheDocument();
  });

  it("REQ-REPORTS-016 show more", async () => {
    show(many(closed, 100, 43), "closed");
    expect(screen.getAllByRole("row")).toHaveLength(16);
    await userEvent.click(screen.getByRole("button", { name: "Show 15 more" }));
    expect(screen.getAllByRole("row")).toHaveLength(31);
  });

  it("REQ-REPORTS-016 sort", async () => {
    const beads = [
      make(open, 1, { created_at: "2026-11-09T00:00:00Z", priority: 1 }),
      make(open, 2, { created_at: "2026-11-01T00:00:00Z", priority: 2 }),
      make(open, 3, { created_at: "2026-11-05T00:00:00Z", priority: 3 }),
    ];
    show(beads);
    const order = () => screen.getAllByRole("link", { name: /^Bead / }).map((a) => a.textContent);
    expect(order()).toEqual(["Bead 1", "Bead 2", "Bead 3"]);
    await userEvent.click(screen.getByRole("button", { name: "Age" }));
    await userEvent.click(screen.getByRole("button", { name: "Age" }));
    expect(screen.getByRole("columnheader", { name: /Age/ })).toHaveAttribute("aria-sort", "descending");
    expect(order()).toEqual(["Bead 1", "Bead 3", "Bead 2"]);
  });

  it("REQ-REPORTS-016 columns per status", () => {
    const beads = [open, progress, closed];
    const expected: [BeadStatus, string[]][] = [
      ["open", ["Bead", "Epic", "Type", "Assignee", "Priority", "Status", "Age"]],
      ["in_progress", ["Bead", "Epic", "Type", "Assignee", "In progress for"]],
      ["closed", ["Bead", "Epic", "Type", "Assignee", "Closed", "Cycle", "On time", "Rework"]],
      ["all", ["Bead", "Epic", "Type", "Assignee", "Status"]],
    ];
    for (const [status, names] of expected) {
      const { unmount } = render(<BeadTable project="alpha" beads={beads} member="" status={status} onStatus={vi.fn()} today="2026-11-12" />);
      expect(headers()).toEqual(names);
      unmount();
    }
  });

  it("REQ-REPORTS-016 chips and warnings", () => {
    show([make(open, 1, { status: "blocked" }), make(open, 2, { status: "open" }), make(open, 3, { status: "deferred" })]);
    for (const text of ["Blocked", "Open", "deferred"]) expect(screen.getByText(text, { selector: "[data-slot=badge]" })).toBeInTheDocument();
    cleanup();
    show([make(progress, 4, { age_days: 4 }), make(progress, 5, { age_days: 2 })], "in_progress");
    expect(screen.getByText("4.0 d")).toHaveClass("text-state-blocked");
    expect(screen.getByText("2.0 d")).not.toHaveClass("text-state-blocked");
  });

  it("REQ-REPORTS-016 empty", () => {
    show([open], "in_progress");
    expect(screen.getByText("No in progress beads in this milestone for ann")).toBeInTheDocument();
    cleanup();
    show([], "all", "");
    expect(screen.getByText("No beads in this milestone")).toBeInTheDocument();
  });
});
