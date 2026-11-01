import { useEffect, useState } from "react";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchProjects, type Project } from "@/features/projects/api";
import { fetchReport, type Report } from "./api";
import { PERIODS, parseReportSearch, reportSearch, type ReportFilters } from "./filters";
import { KpiRow } from "./KpiRow";

type Projects =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; names: string[] };

type Settled = { status: "error"; message: string } | { status: "ok"; report: Report };
type Loaded = { status: "loading" } | Settled;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function ReportsPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const [settled, setSettled] = useState<{ key: string; value: Settled } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { search } = useLocation();
  const filters = parseReportSearch(search);

  useEffect(() => {
    void fetchProjects().then(
      (list: Project[]) => setProjects({ status: "ok", names: list.filter((p) => p.exists).map((p) => p.name) }),
      (error: unknown) => setProjects({ status: "error", message: messageOf(error) }),
    );
  }, []);

  const names = projects.status === "ok" ? projects.names : [];
  const selected = filters.project === "all" || names.includes(filters.project) ? filters.project : (names[0] ?? "");
  const { days, sprint } = filters;

  // an answer counts only for the request it was made for, so a change of filters shows "loading" without a reset
  const key = JSON.stringify([selected, days, sprint, attempt]);
  const loaded: Loaded = settled !== null && settled.key === key ? settled.value : { status: "loading" };

  useEffect(() => {
    if (selected === "") return;
    let live = true;
    fetchReport({ project: selected, days, sprint }).then(
      (report) => {
        if (live) setSettled({ key, value: { status: "ok", report } });
      },
      (error: unknown) => {
        if (live) setSettled({ key, value: { status: "error", message: messageOf(error) } });
      },
    );
    return () => {
      live = false;
    };
  }, [selected, days, sprint, key]);

  const change = (next: ReportFilters) => navigate(`/reports${reportSearch(next)}`, { replace: true });

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        {loaded.status === "ok" && (
          <p className="text-sm text-muted-foreground">
            Generated <time dateTime={loaded.report.generated_at}>{new Date(loaded.report.generated_at).toLocaleString()}</time>
          </p>
        )}
      </div>
      {projects.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {projects.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{projects.message}</AlertDescription>
        </Alert>
      )}
      {projects.status === "ok" && names.length === 0 && <p className="text-muted-foreground">No projects configured.</p>}
      {selected !== "" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Project"
              value={selected}
              onChange={(event) => change({ ...filters, project: event.target.value })}
              className="rounded border bg-background px-2 py-1 text-sm"
            >
              <option value="all">All projects</option>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {PERIODS.map((period) => (
                <Button
                  key={period}
                  type="button"
                  size="sm"
                  variant={period === days ? "default" : "outline"}
                  aria-pressed={period === days}
                  onClick={() => change({ ...filters, project: selected, days: period })}
                >
                  {period} days
                </Button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("sprint");
                change({ ...filters, project: selected, sprint: typeof value === "string" ? value.trim() : "" });
              }}
            >
              <input
                key={sprint}
                name="sprint"
                aria-label="Sprint"
                placeholder="Sprint"
                defaultValue={sprint}
                className="rounded border bg-background px-2 py-1 text-sm"
              />
            </form>
          </div>
          {loaded.status === "loading" && <p className="text-muted-foreground">Loading report…</p>}
          {loaded.status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>The report could not be loaded</AlertTitle>
              <AlertDescription>{loaded.message}</AlertDescription>
              <Button type="button" size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                Retry
              </Button>
            </Alert>
          )}
          {loaded.status === "ok" && (
            <>
              {loaded.report.errors.length > 0 && (
                <Alert>
                  <AlertTitle>Some projects could not be read</AlertTitle>
                  <AlertDescription>
                    <ul>
                      {loaded.report.errors.map((e) => (
                        <li key={e.project}>
                          {e.project}: {e.error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <KpiRow totals={loaded.report.totals} />
              <div data-testid="report-sections" className="flex flex-col gap-8" />
            </>
          )}
        </>
      )}
    </section>
  );
}
