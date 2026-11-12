import { fetchBeads, type BeadSummary } from "@/features/beads/api";
import { fetchProjectBeads, isStale } from "@/features/projects/api";
import { isMine } from "./match";

export type MyTask = { project: string; bead: BeadSummary };
export type ProjectFailure = { project: string; message: string };
export type MyTasks = { tasks: MyTask[]; failures: ProjectFailure[]; stale: string[]; projects: string[] };

export function compareTasks(a: MyTask, b: MyTask): number {
  return (
    a.bead.priority - b.bead.priority ||
    b.bead.updated_at.localeCompare(a.bead.updated_at) ||
    a.project.localeCompare(b.project) ||
    a.bead.id.localeCompare(b.bead.id)
  );
}

export async function loadMyTasks(email: string, closed: boolean, project = ""): Promise<MyTasks> {
  const existing = (await fetchProjectBeads()).filter((p) => p.exists);
  const projects = existing.map((p) => p.name);
  const names = project === "" ? projects : projects.filter((name) => name === project);
  const stale = existing.filter((p) => names.includes(p.name)).filter(isStale).map((p) => p.name);
  const results = await Promise.allSettled(names.map((name) => fetchBeads(name, closed)));
  const tasks: MyTask[] = [];
  const failures: ProjectFailure[] = [];
  results.forEach((result, i) => {
    const project = names[i];
    if (result.status === "rejected") {
      failures.push({ project, message: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    } else {
      for (const bead of result.value) if (isMine(bead, email)) tasks.push({ project, bead });
    }
  });
  return { tasks: tasks.sort(compareTasks), failures, stale, projects };
}
