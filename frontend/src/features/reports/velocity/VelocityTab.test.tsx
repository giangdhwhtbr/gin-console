import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MilestonesError, type MilestoneList } from "@/features/milestones/api";
import { entry, list } from "@/features/milestones/milestoneFixtures";
import { VelocityTab } from "./VelocityTab";
import { vel } from "./velocityFixtures";

afterEach(cleanup);

const alpha = (dpp = { value: 1.4, measured_epics: 6, assumed: false }) =>
  list(
    [
      entry("m1", { status: "closed", start: "2026-10-01", velocity: vel() }),
      entry("m2", { status: "active", start: "2026-11-03", velocity: vel({ committed_points: 13, completed_points: 5, added_points: 2, say_do: 0.38, days_per_point: 1.3, planned_days_per_point: 1.4, accuracy: 1.08 }) }),
      entry("m3", { velocity: vel({ committed_points: null, completed_points: 0, say_do: null }) }),
    ],
    { days_per_point: dpp },
  );
const show = (answer: MilestoneList | MilestonesError, onRetry: () => void = () => undefined) => render(<VelocityTab answer={answer} onRetry={onRetry} />);

describe("VelocityTab", () => {
  it("REQ-REPORTS-018 milestones with velocity: figures, charts and table", () => {
    show(alpha());
    expect(screen.getByText("1.4 days per point")).toBeTruthy();
    expect(screen.getByText("38%", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("1.08", { selector: "dd" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Committed and completed points/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Days per point and planned/ })).toBeTruthy();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell").map((c) => c.textContent))).toEqual([
      ["m1", "10", "8", "0", "80%", "1.5", "1.2", "0.80"],
      ["m2", "13", "5", "2", "38%", "1.3", "1.4", "1.08"],
    ]);
    expect(screen.queryByText("m3")).toBeNull();
    expect(screen.queryByText("assumed")).toBeNull();
  });

  it("REQ-REPORTS-018 assumed days per point", () => {
    show(alpha({ value: 1, measured_epics: 0, assumed: true }));
    expect(screen.getByText("1.0 days per point")).toBeTruthy();
    expect(screen.getByText("assumed")).toBeTruthy();
  });

  it("REQ-REPORTS-018 nothing kicked off yet", () => {
    show(list([entry("m1", { velocity: vel({ committed_points: null, completed_points: 0, say_do: null }) }), entry("m2")], { days_per_point: null }));
    expect(screen.getByText("No kicked-off milestones with points yet")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("REQ-REPORTS-018 Milestones request fails: the failure and Retry, no figures", async () => {
    const onRetry = vi.fn();
    show(new MilestonesError("gin is down"), onRetry);
    expect(screen.getByText("gin is down")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
