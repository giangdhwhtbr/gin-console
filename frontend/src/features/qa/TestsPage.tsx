import { useCallback, useEffect } from "react";
import { isUnknownProject, rememberProject, resolveProject, useConfiguredProjects } from "@/app/project";
import { navigate, useLocation } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, type TabItem } from "@/components/Tabs";
import { Button } from "@/components/ui/button";
import { fetchCases, RESULT_KEYS, testsHref, useFetched, type CaseList as Cases, type ResultKey } from "./api";
import { CaseList } from "./CaseList";
import { CountsTable } from "./CountsTable";
import { caseFiltersToSearch, filterCases, parseCaseFilters, type CaseFilters } from "./filters";
import { QaError } from "./QaError";
import { TrendsTab } from "./TrendsTab";

const SELECT = "min-w-0 max-w-full rounded border bg-background px-2 py-1 text-sm text-foreground";
const RESULT_LABELS: Record<ResultKey, string> = { passed: "Passed", failed: "Failed", blocked: "Blocked", not_run: "Not run", outdated: "Outdated", other: "Other" };
const NO_FILTERS = { capability: null, type: null, result: null, q: "" };
const TABS: readonly TabItem<CaseFilters["tab"]>[] = [
  { value: "cases", label: "Cases" },
  { value: "trends", label: "Trends" },
];

/** REQ-QA-010, REQ-UI-124: the Tests page of the current project, written into the URL without adding a history entry. */
export function TestsPage() {
  const { pathname, search } = useLocation();
  const projects = useConfiguredProjects();
  const asked = new URLSearchParams(search).get("project") ?? "";
  const names = projects.status === "ok" ? projects.names : [];
  const unknown = projects.status === "ok" && isUnknownProject(asked, names);
  const selected = projects.status === "ok" && !unknown ? resolveProject(asked, names) : "";

  usePageTitle(projects.status === "loading" ? null : "Tests", selected);

  useEffect(() => {
    if (selected === "") return;
    rememberProject(selected);
    if (asked === selected) return;
    if (window.location.pathname !== pathname) return; // the user moved on
    const params = new URLSearchParams(search);
    params.set("project", selected);
    navigate(`${pathname}?${params.toString()}`, { replace: true });
  }, [selected, asked, pathname, search]);

  if (projects.status === "loading") return <p className="text-muted-foreground">Loading projects…</p>;
  if (projects.status === "error")
    return (
      <Alert variant="destructive">
        <AlertTitle>Projects could not be loaded</AlertTitle>
        <AlertDescription>{projects.message}</AlertDescription>
      </Alert>
    );
  if (unknown) return <UnknownProject name={asked} names={names} hrefOf={(name) => testsHref(name)} />;
  if (selected === "") return <p className="text-muted-foreground">No projects configured.</p>;
  return <TestsView key={selected} project={selected} search={search} />;
}

function TestsView({ project, search }: { project: string; search: string }) {
  const filters = parseCaseFilters(search);
  const change = (next: CaseFilters) => navigate(`/tests${caseFiltersToSearch(project, next)}`, { replace: true });
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold">Tests</h1>
      <Tabs tabs={TABS} tab={filters.tab} onChange={(tab) => change({ ...filters, tab })} label="Tests views" />
      <div role="tabpanel" id={`panel-${filters.tab}`} aria-labelledby={`tab-${filters.tab}`} className="flex min-w-0 flex-col gap-4">
        {filters.tab === "trends" ? <TrendsTab project={project} filters={filters} onChange={change} /> : <CasesTab project={project} filters={filters} onChange={change} />}
      </div>
    </section>
  );
}

function CasesTab({ project, filters, onChange }: { project: string; filters: CaseFilters; onChange: (next: CaseFilters) => void }) {
  const { state, retry } = useFetched(useCallback(() => fetchCases(project), [project]));
  return (
    <>
      {state.status === "loading" && <p className="text-muted-foreground">Loading cases…</p>}
      {state.status === "error" && <QaError failure={state.failure} onRetry={retry} />}
      {state.status === "ok" && (state.data.cases.length === 0 ? <p>No test cases yet. Write them with <code>/gin-qa:cases</code>.</p> : <Loaded project={project} filters={filters} change={onChange} data={state.data} />)}
    </>
  );
}

function Loaded({ project, filters, change, data }: { project: string; filters: CaseFilters; change: (next: CaseFilters) => void; data: Cases }) {
  const rows = filterCases(data.cases, filters);
  const capabilities = data.counts.by_capability.map((row) => row.name);
  const types = data.counts.by_type.map((row) => row.name);
  return (
    <>
      <CountsTable title="By capability" rows={data.counts.by_capability} groupKey="capability" onPick={(group, result) => change({ ...filters, ...NO_FILTERS, capability: group, result })} />
      <CountsTable title="By type" rows={data.counts.by_type} groupKey="type" onPick={(group, result) => change({ ...filters, ...NO_FILTERS, type: group, result })} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <label className="flex items-center gap-1">
          Capability
          <select className={SELECT} value={filters.capability ?? ""} onChange={(e) => change({ ...filters, capability: e.target.value || null })}>
            <option value="">All</option>
            {capabilities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Type
          <select className={SELECT} value={filters.type ?? ""} onChange={(e) => change({ ...filters, type: e.target.value || null })}>
            <option value="">All</option>
            {types.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Result
          <select className={SELECT} value={filters.result ?? ""} onChange={(e) => change({ ...filters, result: RESULT_KEYS.find((key) => key === e.target.value) ?? null })}>
            <option value="">All</option>
            {RESULT_KEYS.map((key) => (
              <option key={key} value={key}>
                {RESULT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Search
          <input type="search" className={SELECT} value={filters.q} onChange={(e) => change({ ...filters, q: e.target.value })} placeholder="Id or title" />
        </label>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p>No cases match</p>
          <Button variant="outline" size="sm" onClick={() => change({ ...filters, ...NO_FILTERS })}>
            Clear filters
          </Button>
        </div>
      ) : (
        <CaseList project={project} cases={rows} />
      )}
    </>
  );
}
