import { Hint } from "@/components/ui/tooltip";
import { countHint } from "@/lib/definitions";
import type { ProjectOverview } from "./api";
import { BeadLink } from "./BeadLink";
import { workloadOf } from "./workload";

/** REQ-OVERVIEW-005: the work in progress of each person across projects. */
export function WorkloadSection({ projects }: { projects: readonly ProjectOverview[] }) {
  const rows = workloadOf(projects);
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="text-xl font-semibold">
        <Hint text={countHint("overviewWorkload", "all projects")}>
          <span tabIndex={0}>Work in progress</span>
        </Hint>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {rows.map(({ person, total, perProject, beads }) => (
            <li key={person ?? ""} data-person={person ?? "Unassigned"} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
              <span className={person === null ? "text-muted-foreground" : "font-semibold"}>{person ?? "Unassigned"}</span>
              <span className="font-semibold">{total}</span>
              {perProject.map(({ project, count }) => (
                <span key={project} className="text-xs text-muted-foreground">{`${count} in ${project}`}</span>
              ))}
              <details className="w-full min-w-0">
                <summary className="w-fit cursor-pointer text-13">Beads</summary>
                <ul className="flex flex-col gap-1 pt-1 pl-4">
                  {beads.map(({ project, bead }) => (
                    <li key={JSON.stringify([project, bead.id])} className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                      <BeadLink project={project} id={bead.id} title={bead.title} />
                      <span className="text-xs text-muted-foreground">{project}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
