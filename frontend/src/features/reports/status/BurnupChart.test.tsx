import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BurnupChart, BurnupTooltip, buildBurnupSeries } from "./BurnupChart";

afterEach(cleanup);

const burnup = [
  { day: "2026-11-11", scope_points: 24, done_points: 0 },
  { day: "2026-11-18", scope_points: 27, done_points: 6 },
  { day: "2026-11-23", scope_points: 27, done_points: 9.5 },
];
const changes = { scope_from: 24, scope_to: 27, items: [] };

describe("BurnupChart", () => {
  it("REQ-REPORTS-029 Lines and markers: draws Scope, Done, Needed pace, Forecast, Today, End and warning wash", () => {
    const { container } = render(
      <BurnupChart burnup={burnup} end="2026-12-02" today="2026-11-23" paceFinish="2026-12-07" changes={changes} />,
    );
    expect(screen.getByRole("heading", { name: "Burn-up" })).toBeInTheDocument();
    expect(screen.getByText("Points done against scope. The scope line steps up when work is added after kickoff.")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Burn-up: 9.5 of 27 points done; scope 24 → 27 points since kickoff" }),
    ).toBeInTheDocument();

    // Legend names all four lines
    for (const label of ["Scope", "Done", "Needed pace", "Forecast"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    // Series data verification: Needed pace ends at 27 on 2 Dec, Forecast ends at 27 on 7 Dec, wash starts 3 Dec
    const { rows, afterEnd, lastDay } = buildBurnupSeries(burnup, "2026-12-02", "2026-11-23", "2026-12-07");
    expect(rows[0]).toMatchObject({ day: "2026-11-11", scope: 24, done: 0, needed: 0 });
    expect(rows.find((r) => r.day === "2026-11-23")).toMatchObject({ scope: 27, done: 9.5, forecast: 9.5 });
    expect(rows.find((r) => r.day === "2026-12-02")).toMatchObject({ needed: 27 });
    expect(rows.find((r) => r.day === "2026-12-07")).toMatchObject({ forecast: 27 });
    expect(afterEnd).toBe("2026-12-03");
    expect(lastDay).toBe("2026-12-07");

    // Today, End 2 Dec and warning wash rendered in SVG
    expect(container.textContent).toContain("Today");
    expect(container.textContent).toContain("End 2 Dec");
    expect(container.querySelector(".recharts-reference-area")).not.toBeNull();
  });

  it("REQ-REPORTS-029 leaves out Forecast when paceFinish is null", () => {
    const { rows } = buildBurnupSeries(burnup, "2026-12-02", "2026-11-23", null);
    expect(rows.every((r) => r.forecast === null)).toBe(true);
  });

  it("REQ-REPORTS-029 Day details: tooltip shows date, Scope and Done points", () => {
    render(
      <BurnupTooltip
        active
        today="2026-11-23"
        payload={[
          {
            payload: { day: "2026-11-18", scope: 27, done: 6, needed: null, forecast: null },
          },
        ]}
      />,
    );
    expect(screen.getByText("18 Nov")).toBeInTheDocument();
    expect(screen.getByText("Scope 27 points")).toBeInTheDocument();
    expect(screen.getByText("Done 6 points")).toBeInTheDocument();
  });
});
