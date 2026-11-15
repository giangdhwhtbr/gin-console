import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { useId, useState } from "react";
import { isBlockError, type Beads, type Epic, type Project, type Workflow } from "./api";

function HealthBlock({ workflow }: { workflow: Workflow }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { workspace, team } = workflow;
  const warnings = workflow.warnings ?? [];
  const remedies = workflow.remedies ?? [];
  const waivers = workflow.review_waivers ?? [];
  const hold = workflow.decision === "hold";
  const alert = hold || warnings.length > 0 || remedies.length > 0;
  const activeTeam = team?.enabled ? team : null;
  if (!workspace && !activeTeam && !alert && waivers.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {workspace && (
        <div>
          <span>{`workspace · ${workspace.repos.length} repos`}</span>{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide repos" : "Show repos"}
          </button>
          {open && (
            <ul id={listId} className="mt-1 flex flex-col gap-0.5">
              {workspace.repos.map((repo) => (
                <li key={repo.path} className="flex flex-wrap items-center gap-1">
                  <span className="font-mono">{repo.path}</span>
                  <span>{`${repo.branch ?? "-"} · ${repo.shape ?? "-"}`}</span>
                  {repo.frozen && <Badge variant="secondary">frozen</Badge>}
                  {!repo.present && <Badge variant="destructive">missing</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {activeTeam && <span>{`team · ${activeTeam.host ?? "-"}`}</span>}
      {alert && (
        <div role="alert" className="rounded border border-destructive/50 p-2 text-destructive">
          {workflow.decision && <p>{`decision: ${workflow.decision}`}</p>}
          <ul>
            {warnings.map((text) => (
              <li key={`w-${text}`}>{text}</li>
            ))}
            {remedies.map((text) => (
              <li key={`r-${text}`}>{`remedy: ${text}`}</li>
            ))}
          </ul>
        </div>
      )}
      {waivers.length > 0 && (
        <div>
          <span>{`${waivers.length} review waiver${waivers.length === 1 ? "" : "s"}`}</span>
          <ul>
            {waivers.map((w) => (
              <li key={w.task_id}>{`${w.task_id}: ${w.reason} (${w.actor})`}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EpicStage({ epic }: { epic: Epic }) {
  const { workflow } = epic;
  if (epic.status !== "in_progress") {
    return epic.status === undefined ? null : <Badge variant="outline">ready</Badge>;
  }
  if (!workflow) return null;
  if (isBlockError(workflow)) {
    return (
      <Badge variant="outline" title={workflow.error}>
        stage unknown
      </Badge>
    );
  }
  const details = [
    ...workflow.warnings,
    ...workflow.review_waivers.map((w) => `review waiver ${w.task_id}: ${w.reason} (${w.actor})`),
  ];
  return (
    <>
      <Badge variant="secondary">{workflow.stage}</Badge>
      {details.length > 0 && (
        <span title={details.join("\n")}>
          <span aria-hidden="true">{`⚠ ${details.length}`}</span>
          <span className="sr-only">{`warnings: ${details.join("; ")}`}</span>
        </span>
      )}
    </>
  );
}

function BeadsBlock({ beads, projectName }: { beads: Beads; projectName: string }) {
  const counts: [string, number][] = [
    ["open", beads.open],
    ["in progress", beads.in_progress],
    ["blocked", beads.blocked],
    ["ready", beads.ready],
  ];
  if ((beads.prep ?? 0) > 0) counts.push(["prep", beads.prep ?? 0]);
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
              {epic.title} <EpicStage epic={epic} />
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
          <Link
            to={`/beads?project=${encodeURIComponent(project.name)}`}
            className="underline underline-offset-2"
          >
            {project.name}
          </Link>
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
          <HealthBlock workflow={workflow} />
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
