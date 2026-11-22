import { Link } from "@/app/Link";
import { TriangleAlert } from "lucide-react";
import { Hint } from "@/components/ui/tooltip";
import { countHint, type DefinitionKey } from "@/lib/definitions";
import { useId, useState } from "react";
import { isBlockError, pullOf, type Beads, type Epic, type Project, type Workflow } from "./api";
import { PullLine } from "./PullLine";

// the backend may omit a field or send a malformed one: never crash the page
const list = <T,>(value: readonly T[] | null | undefined): readonly T[] => {
  if (!Array.isArray(value)) return [];
  return value as readonly T[];
};

function HealthBlock({ workflow }: { workflow: Workflow }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { workspace, team } = workflow;
  const warnings = list(workflow.warnings);
  const remedies = list(workflow.remedies);
  const waivers = list(workflow.review_waivers);
  const repos = list(workspace?.repos);
  const hold = workflow.decision === "hold";
  const alert = hold || warnings.length > 0 || remedies.length > 0;
  const activeTeam = team?.enabled ? team : null;
  if (!workspace && !activeTeam && !alert && waivers.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {workspace && (
        <div>
          <span>{`Workspace of ${repos.length} repos`}</span>{" "}
          <button
            type="button"
            className="hover:text-identity"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide repos" : "Show repos"}
          </button>
          {open && (
            <ul id={listId} className="mt-1 flex flex-col gap-0.5">
              {repos.map((repo) => (
                <li key={repo.path} className="flex flex-wrap items-center gap-1">
                  <span className="break-all font-mono">{repo.path}</span>
                  <span>{`${repo.branch ?? "-"}, ${repo.shape ?? "-"}`}</span>
                  {repo.frozen && <span className="text-muted-foreground">frozen</span>}
                  {!repo.present && <span className="text-destructive">missing</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {activeTeam && <span>{`Team mode on ${activeTeam.host ?? "-"}`}</span>}
      {alert && (
        <div role="alert" className="rounded border border-destructive/50 p-2 text-destructive">
          {workflow.decision && <p>{`decision: ${workflow.decision}`}</p>}
          <ul>
            {warnings.map((text, i) => (
              <li key={`w-${i}-${text}`} className="break-words">
                {text}
              </li>
            ))}
            {remedies.map((text, i) => (
              <li key={`r-${i}-${text}`} className="break-words">
                {`remedy: ${text}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {waivers.length > 0 && (
        <div>
          <span>{`${waivers.length} review waiver${waivers.length === 1 ? "" : "s"}`}</span>
          <ul>
            {waivers.map((w, i) => (
              <li key={`${i}-${w.task_id}`} className="break-words">
                {`${w.task_id}: ${w.reason} (${w.actor})`}
              </li>
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
    return epic.status === undefined ? null : <span className="text-muted-foreground">ready</span>;
  }
  if (!workflow) return null;
  if (isBlockError(workflow)) {
    return (
      <span title={workflow.error} className="text-destructive">
        stage unknown
      </span>
    );
  }
  const details = [
    ...list(workflow.warnings),
    ...list(workflow.review_waivers).map((w) => `review waiver ${w.task_id}: ${w.reason} (${w.actor})`),
  ];
  return (
    <>
      <span className="text-muted-foreground">{workflow.stage}</span>
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
  const counts: [string, number, DefinitionKey][] = [
    ["open", beads.open, "open"],
    ["in progress", beads.in_progress, "inProgress"],
    ["blocked", beads.blocked, "blocked"],
    ["ready", beads.ready, "ready"],
  ];
  if ((beads.prep ?? 0) > 0) counts.push(["prep", beads.prep ?? 0, "prep"]);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-3">
        {counts.map(([label, count, rule]) => (
          <Hint key={label} text={countHint(rule, "this project")}>
            {label === "blocked" && count > 0 ? (
              <span tabIndex={0} className="inline-flex items-center gap-1 rounded font-medium text-state-blocked focus-visible:outline-2 focus-visible:outline-ring">
                <TriangleAlert aria-hidden className="size-3.5" />
                {`${label} ${count}`}
              </span>
            ) : (
              <span tabIndex={0} className="rounded focus-visible:outline-2 focus-visible:outline-ring">{`${label} ${count}`}</span>
            )}
          </Hint>
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
  const pull = pullOf(project);
  return (
    <article aria-label={project.name} className="flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium">
          <Link
            to={`/beads?project=${encodeURIComponent(project.name)}`}
            className="hover:text-identity"
          >
            {project.name}
          </Link>
        </h2>
        {!project.exists && <span className="text-sm text-destructive">missing</span>}
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
      {pull !== null && <PullLine pull={pull} />}
    </article>
  );
}
