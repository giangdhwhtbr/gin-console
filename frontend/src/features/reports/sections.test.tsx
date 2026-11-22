import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliverySection as Delivery } from "./api";
import { DeliverySection } from "./DeliverySection";
import { report } from "./reportFixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("report sections", () => {
  it("REQ-UI-090 delivery: weeks, ranges by type and member, no work in progress", () => {
    const base = report();
    const d: Delivery = {
      ...base.delivery,
      weeks: [
        { week: "2026-W43", counts: { task: 1, bug: 2 } },
        { week: "2026-W44", counts: { task: 3 } },
      ],
      by_type: [{ key: "task", cycle: { n: 3, median: 2, p85: 4 }, lead: null }],
      by_member: [{ key: "ann", cycle: { n: 3, median: 1.5, p85: 4 }, lead: { n: 3, median: 5, p85: 6 } }],
    };
    const { container } = render(<DeliverySection delivery={d} />);
    expect(container.querySelectorAll(".recharts-bar").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("task: 3 beads, median 2.0 d, 85th percentile 4.0 d")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "By member" }));
    expect(screen.getByRole("button", { name: "By member" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("ann: 3 beads, median 1.5 d, 85th percentile 4.0 d")).toBeTruthy();
    expect(screen.getByLabelText("ann: 3 beads, median 5.0 d, 85th percentile 6.0 d")).toBeTruthy();
    expect(screen.queryByText("Oldest in progress")).toBeNull();
    expect(screen.queryByText("In progress by member")).toBeNull();
    expect(screen.queryByText("Estimate and actual")).toBeNull();
  });

  it("REQ-UI-090 estimate difference as text", () => {
    const base = report();
    const est = (id: string, actual: number) => ({ project: "alpha", id, title: id, estimate_days: 5, points: null, actual_days: actual, days_per_point: null });
    render(<DeliverySection delivery={{ ...base.delivery, estimates: [est("e-1", 7), est("e-2", 3)] }} />);
    expect(screen.getByText("Estimate and actual")).toBeTruthy();
    expect(screen.getByText("+2 d")).toHaveClass("text-state-blocked");
    expect(screen.getByText("−2 d")).not.toHaveClass("text-state-blocked");
    // REQ-UI-140 text, not a chip
    expect(screen.getByText("+2 d").closest('[data-slot="badge"]')).toBeNull();
    expect(screen.getByText("−2 d").closest('[data-slot="badge"]')).toBeNull();
  });

  it("REQ-UI-090 points row shows points and days per point, and no chip", () => {
    const base = report();
    const row = { project: "alpha", id: "p-1", title: "p-1", estimate_days: null, points: 5, actual_days: 6, days_per_point: 1.2 };
    render(<DeliverySection delivery={{ ...base.delivery, estimates: [row, { ...row, id: "d-1", title: "d-1", estimate_days: 4, points: null, days_per_point: null }] }} />);
    expect(screen.getByText("5 pt")).toBeTruthy();
    expect(screen.getByText("1.2 days per point")).toBeTruthy();
    expect(screen.getByText("4d")).toBeTruthy();
    expect(screen.getByText("+2 d")).toBeTruthy();
    expect(screen.getAllByText(/^(\+|−)\d+ d$|^on estimate$/)).toHaveLength(1);
  });

  it("REQ-UI-093 an empty delivery section says so and draws no chart", () => {
    const base = report();
    const { container } = render(<DeliverySection delivery={{ ...base.delivery, weeks: [{ week: "2026-W44", counts: { task: 0 } }] }} />);
    expect(screen.getAllByText("No data in this period")).toHaveLength(1);
    expect(container.querySelector(".recharts-surface")).toBeNull();
  });
});
