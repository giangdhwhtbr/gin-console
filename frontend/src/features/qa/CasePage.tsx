import { useCallback } from "react";
import { Link } from "@/app/Link";
import { ProjectGuard } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { sectionHref } from "@/features/requirements/paths";
import { fetchCase, testsHref, useFetched, type CaseBug, type CaseDetail } from "./api";
import { LatestRun } from "./LatestRun";
import { QaError } from "./QaError";

const text = (item: unknown): string => (typeof item === "string" ? item : JSON.stringify(item));

function Items({ title, items, ordered }: { title: string; items: readonly unknown[]; ordered?: boolean }) {
  if (items.length === 0) return null;
  const List = ordered === true ? "ol" : "ul";
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-base font-semibold">{title}</h2>
      <List className={ordered === true ? "list-decimal pl-5 text-sm" : "list-disc pl-5 text-sm"}>
        {items.map((item, index) => (
          // the export lists have no ids and are never reordered
          <li key={index} className="break-words">
            {text(item)}
          </li>
        ))}
      </List>
    </section>
  );
}

function Bug({ project, bug }: { project: string; bug: CaseBug }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-muted-foreground">Bug</span>
      <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bug.id)}`} className="prose-link">
        {bug.id}
      </Link>
      {bug.title !== null && <span>{bug.title}</span>}
      {bug.status !== null && <span className="text-muted-foreground">{bug.status}</span>}
      {bug.priority !== null && <span className="text-muted-foreground">{`P${bug.priority}`}</span>}
    </p>
  );
}

function CaseView({ project, detail }: { project: string; detail: CaseDetail }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{`${detail.id} ${detail.title}`}</h1>
        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span>{detail.capability}</span>
          <span>{detail.type}</span>
          <span>{detail.priority}</span>
          <span className="font-medium text-foreground">{detail.effective_result}</span>
        </p>
      </div>
      {detail.reqs.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="text-muted-foreground">Requirements</span>
          {detail.reqs.map((req) => (
            <Link key={req} to={sectionHref("matrix", project, { req })} className="prose-link font-mono">
              {req}
            </Link>
          ))}
        </p>
      )}
      {detail.bug !== null && <Bug project={project} bug={detail.bug} />}
      <Items title="Preconditions" items={detail.preconditions} />
      <Items title="Steps" items={detail.steps} ordered />
      <Items title="Expected results" items={detail.expected} />
      <LatestRun project={project} caseId={detail.id} run={detail.latest_run} reason={detail.latest_run_reason} />
    </>
  );
}

/** REQ-QA-011, REQ-QA-013: one case of a project; the project becomes the current one (REQ-UI-124). */
export function CasePage({ project, id }: { project: string; id: string }) {
  return (
    <ProjectGuard project={project} hrefOf={(name) => testsHref(name)}>
      <CaseLoader project={project} id={id} />
    </ProjectGuard>
  );
}

function CaseLoader({ project, id }: { project: string; id: string }) {
  const { state, retry } = useFetched(useCallback(() => fetchCase(project, id), [project, id]));
  usePageTitle(state.status === "ok" ? `${id} ${state.data.title}` : id, project);
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {state.status === "loading" && <p className="text-muted-foreground">Loading case…</p>}
      {state.status === "error" && (
        <>
          <h1 className="text-2xl font-semibold">{id}</h1>
          <QaError failure={state.failure} onRetry={retry} />
        </>
      )}
      {state.status === "ok" && <CaseView project={project} detail={state.data} />}
      <Link to={testsHref(project)} className="prose-link w-fit text-sm">
        All tests
      </Link>
    </section>
  );
}
