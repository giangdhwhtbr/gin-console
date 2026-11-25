import { personOf } from "@/lib/people";
import type { ActiveBead, ProjectOverview } from "./api";

export type Workload = { person: string | null; total: number; perProject: { project: string; count: number }[]; beads: { project: string; bead: ActiveBead }[] };

/** REQ-OVERVIEW-005: one row per person across projects, highest total first, Unassigned last. */
export function workloadOf(projects: readonly ProjectOverview[]): Workload[] {
  const people = new Map<string | null, { project: string; bead: ActiveBead }[]>();
  for (const project of projects) {
    for (const bead of project.in_progress) {
      const person = personOf(bead.assignee);
      people.set(person, [...(people.get(person) ?? []), { project: project.name, bead }]);
    }
  }
  return [...people.entries()]
    .map(([person, beads]) => {
      const counts = new Map<string, number>();
      for (const { project } of beads) counts.set(project, (counts.get(project) ?? 0) + 1);
      return { person, total: beads.length, perProject: [...counts].map(([project, count]) => ({ project, count })), beads };
    })
    .sort((a, b) => Number(a.person === null) - Number(b.person === null) || b.total - a.total || (a.person ?? "").localeCompare(b.person ?? ""));
}
