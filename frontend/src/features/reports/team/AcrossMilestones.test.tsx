import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { milestonePath } from "@/features/milestones/api";
import type { TrendRow } from "../teamApi";
import { AcrossMilestones } from "./AcrossMilestones";

afterEach(cleanup);

const trend: TrendRow[] = [
  { id: "m0", title: "Milestone zero", start: "2026-09-01", end: "2026-09-30", closed: 12, points_delivered: 8, on_time: 0.75, rework_rate: 0.1, accuracy: null },
  { id: "m1", title: "Milestone one", start: "2026-10-05", end: "2026-10-30", closed: 20, points_delivered: 13, on_time: 0.9, rework_rate: 0.05, accuracy: 0.92 },
  { id: "m2", title: "Milestone two", start: "2026-11-02", end: "2026-11-27", closed: 15, points_delivered: 10.5, on_time: 1, rework_rate: null, accuracy: 1.08 },
];

describe("AcrossMilestones", () => {
  it("REQ-REPORTS-036 Across milestones: chart, table, highlight, links and null dashes", () => {
    const { container } = render(<AcrossMilestones project="alpha" trend={trend} selected="m2" />);
    expect(screen.getByRole("heading", { name: "Across milestones" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Points delivered per milestone/ })).toBeInTheDocument();
    const bars = container.querySelectorAll(".recharts-bar-rectangle path");
    expect(bars).toHaveLength(3);
    const outlined = Array.from(bars).filter((p) => p.getAttribute("stroke") === "var(--color-identity)");
    expect(outlined).toHaveLength(1);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => within(r).getAllByRole("cell").map((c) => c.textContent))).toEqual([
      ["Milestone zero", "12", "8", "75%", "10%", "—"],
      ["Milestone one", "20", "13", "90%", "5%", "0.92"],
      ["Milestone two", "15", "10.5", "100%", "—", "1.08"],
    ]);

    expect(rows[2]).toHaveAttribute("aria-current", "true");
    expect(rows[2]).toHaveClass("bg-muted");
    expect(rows[0]).not.toHaveAttribute("aria-current");
    expect(rows[1]).not.toHaveAttribute("aria-current");

    expect(screen.getByRole("link", { name: "Milestone zero" })).toHaveAttribute("href", milestonePath("alpha", "m0"));
    expect(screen.getByRole("link", { name: "Milestone two" })).toHaveAttribute("href", milestonePath("alpha", "m2"));
  });

  it("REQ-REPORTS-036 Across milestones: empty trend shows placeholder", () => {
    render(<AcrossMilestones project="alpha" trend={[]} selected={null} />);
    expect(screen.getByRole("heading", { name: "Across milestones" })).toBeInTheDocument();
    expect(screen.getByText("No started milestones yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
