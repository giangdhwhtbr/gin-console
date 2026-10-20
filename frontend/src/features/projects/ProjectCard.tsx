import type { ReactNode } from "react";
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { isBlockError, type Beads, type Project, type Workflow } from "./api";

function MaybeLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (href === null) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  );
}

const gateVariant = (state: string) =>
  state === "satisfied" ? "default" : state.startsWith("waived") ? "secondary" : "outline";

function WorkflowBlock({ workflow }: { workflow: Workflow }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="secondary">{workflow.stage}</Badge>
      {Object.entries(workflow.gates).map(([gate, state]) => (
        <Badge key={gate} variant={gateVariant(state)}>
          {`${gate}: ${state}`}
        </Badge>
      ))}
    </div>
  );
}

function BeadsBlock({ beads, projectName }: { beads: Beads; projectName: string }) {
  const counts: [string, number][] = [
    ["open", beads.open],
    ["in progress", beads.in_progress],
    ["blocked", beads.blocked],
    ["ready", beads.ready],
  ];
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-3">
        {counts.map(([label, count]) => (
          <span key={label}>{`${label} ${count}`}</span>
        ))}
      </div>
      {beads.epics.length === 0 ? (
        <p className="text-muted-foreground">no active epics</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {beads.epics.map((epic) => (
            <li key={epic.id}>
              <Link to={`/beads/${encodeURIComponent(projectName)}/${encodeURIComponent(epic.id)}`}>
                <span className="font-mono">{epic.id}</span>
              </Link>{" "}
              {epic.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const { workflow, beads } = project;
  return (
    <article aria-label={project.name} className="flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium">
          <MaybeLink href={project.scotty_url}>{project.name}</MaybeLink>
        </h2>
        {!project.exists && <Badge variant="destructive">missing</Badge>}
        <span className="w-full break-all font-mono text-sm text-muted-foreground">
          {project.path}
        </span>
      </header>
      {workflow !== null &&
        (isBlockError(workflow) ? (
          <p className="text-sm text-destructive">{`workflow: ${workflow.error}`}</p>
        ) : (
          <WorkflowBlock workflow={workflow} />
        ))}
      {beads !== null &&
        (isBlockError(beads) ? (
          <p className="text-sm text-destructive">{`beads: ${beads.error}`}</p>
        ) : (
          <BeadsBlock beads={beads} projectName={project.name} />
        ))}
    </article>
  );
}
