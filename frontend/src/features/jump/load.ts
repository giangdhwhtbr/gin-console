import { fetchBeads } from "@/features/beads/api";
import { fetchProjectBeads } from "@/features/projects/api";
import type { Entry } from "./search";

export type Loaded = { entries: Entry[]; failures: string[] };

/** REQ-UI-154: the beads of every project, closed ones included; a failing project is named, the others are kept. */
export async function loadAllBeads(): Promise<Loaded> {
  const projects = (await fetchProjectBeads()).filter((p) => p.exists);
  const results = await Promise.allSettled(projects.map((p) => fetchBeads(p.name, true)));
  const loaded: Loaded = { entries: [], failures: [] };
  results.forEach((result, i) => {
    const project = projects[i].name;
    if (result.status === "rejected") loaded.failures.push(project);
    else loaded.entries.push(...result.value.map((bead) => ({ project, bead })));
  });
  return loaded;
}
