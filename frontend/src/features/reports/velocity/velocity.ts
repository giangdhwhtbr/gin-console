import type { MilestoneList, Velocity } from "@/features/milestones/api";

export type VelocityPoint = { id: string; title: string; start: string | null; velocity: Velocity };

/** REQ-REPORTS-018: the milestones with a commitment or completed points, oldest start first (no start last). */
export function velocityMilestones(list: MilestoneList): VelocityPoint[] {
  return list.milestones
    .flatMap((m) =>
      m.velocity !== null && (m.velocity.committed_points !== null || m.velocity.completed_points > 0)
        ? [{ id: m.id, title: m.title, start: m.start, velocity: m.velocity }]
        : [],
    )
    .sort((a, b) => (a.start ?? "9999").localeCompare(b.start ?? "9999"));
}

/** The milestone with the latest start among those whose say/do is known. */
export function latestSayDo(points: readonly VelocityPoint[]): VelocityPoint | null {
  const known = points.filter((p) => p.velocity.say_do !== null);
  return known.reduce<VelocityPoint | null>((latest, p) => (latest === null || (p.start ?? "") >= (latest.start ?? "") ? p : latest), null);
}
