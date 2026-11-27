import { fetchBeads, type BeadSummary } from "@/features/beads/api";
import { fetchProjectBeads, fetchOf, isStale, pullError, pullOf } from "@/features/projects/api";
import type { PullFailure } from "@/features/beads/PullNote";

export type ProjectFailure = { project: string; message: string };
export type MyTasks = {
  beads: BeadSummary[];
  failures: ProjectFailure[];
  stale: string[];
  pullFailures: PullFailure[];
};

/** Every bead of `project` (a configured name); the page groups them (REQ-UI-150), merge gates included so that a blocker can be named. */
export async function loadMyTasks(closed: boolean, project: string): Promise<MyTasks> {
  const current = (await fetchProjectBeads()).filter((p) => p.exists && p.name === project);
  const stale = current.filter(isStale).map((p) => p.name);
  const pullFailures = current.flatMap((p) => {
    const pull = pullOf(p);
    const fetched = fetchOf(p);
    return [
      ...(pull?.status === "error" ? [{ project: p.name, path: p.path, error: pullError(pull) }] : []),
      ...(fetched?.status === "error"
        ? [{ project: p.name, path: p.path, error: fetched.error ?? "unknown error", kind: "attachments" as const }]
        : []),
    ];
  });
  let beads: BeadSummary[] = [];
  const failures: ProjectFailure[] = [];
  try {
    beads = await fetchBeads(project, closed);
  } catch (error) {
    failures.push({ project, message: error instanceof Error ? error.message : String(error) });
  }
  return { beads, failures, stale, pullFailures };
}
