import type { Velocity } from "@/features/milestones/api";

export const vel = (over: Partial<Velocity> = {}): Velocity => ({
  committed_points: 10, completed_points: 8, added_points: 0, say_do: 0.8, days_per_point: 1.5, planned_days_per_point: 1.2, accuracy: 0.8, ...over,
});
