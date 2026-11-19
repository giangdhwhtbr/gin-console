import { describe, expect, it } from "vitest";
import { entry, list } from "@/features/milestones/milestoneFixtures";
import { vel } from "./velocityFixtures";
import { latestSayDo, velocityMilestones } from "./velocity";

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
    const milestones = list([
      entry("m1", { start: "2026-10-01", velocity: vel({ say_do: 0.8 }) }),
      entry("m2", { start: "2026-11-03", velocity: vel({ say_do: 0.38 }) }),
      entry("m3", { start: "2026-12-01", velocity: vel({ say_do: null, completed_points: 2 }) }),
    ]);
    expect(latestSayDo(milestones)?.id).toBe("m2");
    expect(latestSayDo(list([]))).toBeNull();
  });

  it("REQ-REPORTS-018 latest say/do also counts a milestone that does not qualify for the charts", () => {
    const milestones = list([
      entry("m1", { start: "2026-10-01", velocity: vel({ say_do: 0.8 }) }),
      entry("m2", { start: "2026-11-03", velocity: vel({ committed_points: null, completed_points: 0, say_do: 0.5 }) }),
    ]);
    expect(velocityMilestones(milestones).map((p) => p.id)).toEqual(["m1"]);
    expect(latestSayDo(milestones)?.id).toBe("m2");
  });
});
