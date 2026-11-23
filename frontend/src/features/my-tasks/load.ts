import { fetchBeads, type BeadSummary } from "@/features/beads/api";
import { withoutMergeGates } from "@/features/beads/mergeGates";
import { fetchProjectBeads, isStale, pullError, pullOf } from "@/features/projects/api";
import type { PullFailure } from "@/features/beads/PullNote";
import { isMine } from "./match";

export type MyTask = { project: string; bead: BeadSummary };
export type ProjectFailure = { project: string; message: string };
export type MyTasks = {
  tasks: MyTask[];
  failures: ProjectFailure[];
  stale: string[];
  pullFailures: PullFailure[];
};

export function compareTasks(a: MyTask, b: MyTask): number {
  return (
    a.bead.priority - b.bead.priority ||
    b.bead.updated_at.localeCompare(a.bead.updated_at) ||
    a.bead.id.localeCompare(b.bead.id)
  );
}

/** The beads of `project` (a configured name) assigned to `email`. */
export async function loadMyTasks(email: string, closed: boolean, project: string): Promise<MyTasks> {
  const current = (await fetchProjectBeads()).filter((p) => p.exists && p.name === project);
  const stale = current.filter(isStale).map((p) => p.name);
  const pullFailures = current.flatMap((p) => {
    const pull = pullOf(p);
    return pull?.status === "error" ? [{ project: p.name, path: p.path, error: pullError(pull) }] : [];
  });
  const tasks: MyTask[] = [];
  const failures: ProjectFailure[] = [];
  try {
    for (const bead of withoutMergeGates(await fetchBeads(project, closed))) if (isMine(bead, email)) tasks.push({ project, bead });
  } catch (error) {
    failures.push({ project, message: error instanceof Error ? error.message : String(error) });
  }
  return { tasks: tasks.sort(compareTasks), failures, stale, pullFailures };
}
