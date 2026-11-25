import type { AgingBead, BlockedBead, ProjectOverview, ReadyBead } from "./api";

export type Row<T> = { project: string; bead: T };

const byId = (a: Row<{ id: string }>, b: Row<{ id: string }>) => a.bead.id.localeCompare(b.bead.id) || a.project.localeCompare(b.project);
const byWait = (a: Row<AgingBead>, b: Row<AgingBead>) => b.bead.days - a.bead.days || byId(a, b);
const rowsOf = <T,>(projects: readonly ProjectOverview[], pick: (project: ProjectOverview) => T[]): Row<T>[] =>
  projects.flatMap((project) => pick(project).map((bead) => ({ project: project.name, bead })));

export const blockedRows = (projects: readonly ProjectOverview[]): Row<BlockedBead>[] => rowsOf(projects, (p) => p.blocked).sort(byWait);
export const agingRows = (projects: readonly ProjectOverview[]): Row<AgingBead>[] => rowsOf(projects, (p) => p.aging).sort(byWait);
export const unassignedRows = (projects: readonly ProjectOverview[]): Row<ReadyBead>[] =>
  rowsOf(projects, (p) => p.unassigned).sort((a, b) => (a.bead.priority ?? Infinity) - (b.bead.priority ?? Infinity) || byId(a, b));
