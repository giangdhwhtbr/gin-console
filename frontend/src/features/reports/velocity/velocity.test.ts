import { describe, expect, it } from "vitest";
import { entry, list } from "@/features/milestones/milestoneFixtures";
import type { Velocity } from "@/features/milestones/api";
import { latestSayDo, velocityMilestones } from "./velocity";

export const vel = (over: Partial<Velocity> = {}): Velocity => ({
  committed_points: 10, completed_points: 8, added_points: 0, say_do: 0.8, days_per_point: 1.5, planned_days_per_point: 1.2, accuracy: 0.8, ...over,
});

describe("velocityMilestones", () => {
  it("REQ-REPORTS-018 keeps milestones with a commitment or completed points, oldest start first", () => {
    const points = velocityMilestones(
      list([
        entry("m2", { start: "2026-11-03", velocity: vel() }),
        entry("m0", { start: "2026-10-01", velocity: vel({ committed_points: null, completed_points: 3, say_do: null }) }),
        entry("m3", { start: "2026-12-01", velocity: vel({ committed_points: null, completed_points: 0 }) }),
        entry("m4", { start: "2026-12-08", velocity: null }),
        entry("m1", { start: "2026-10-15", velocity: vel({ committed_points: 0, completed_points: 0 }) }),
      ]),
    );
    expect(points.map((p) => p.id)).toEqual(["m0", "m1", "m2"]);
  });

  it("REQ-REPORTS-018 latest say/do is the latest start with a say/do", () => {
    const points = velocityMilestones(
      list([
        entry("m1", { start: "2026-10-01", velocity: vel({ say_do: 0.8 }) }),
        entry("m2", { start: "2026-11-03", velocity: vel({ say_do: 0.38 }) }),
        entry("m3", { start: "2026-12-01", velocity: vel({ say_do: null, completed_points: 2 }) }),
      ]),
    );
    expect(latestSayDo(points)?.id).toBe("m2");
    expect(latestSayDo([])).toBeNull();
  });
});
