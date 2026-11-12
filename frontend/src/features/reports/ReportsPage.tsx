import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs } from "@/components/Tabs";
import { Button } from "@/components/ui/button";
import { fetchProjectBeads, type ProjectBeads } from "@/features/projects/api";
import { cn } from "@/lib/utils";
import { fetchReport, type Report } from "./api";
import { PERIODS, TABS, parseReportSearch, reportSearch, type ReportFilters, type ReportTab } from "./filters";
import { CoverageSection } from "./CoverageSection";
import { DeliverySection } from "./DeliverySection";
import { Figures } from "./Figures";
import { figures, headlines, type Headline } from "./headlines";
import { QualitySection } from "./QualitySection";
import { UsageSection } from "./UsageSection";

type Projects =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; names: string[] };

type Settled = { status: "error"; message: string } | { status: "ok"; report: Report };
type Loaded = { status: "loading" } | Settled;

const LABELS: Record<ReportTab, string> = { delivery: "Delivery", usage: "AI usage", quality: "Quality", coverage: "Data coverage" };
const hintOf = (h: Headline) => (
  <span className={cn("inline-flex items-center gap-1", h.warn && "text-state-blocked")}>
    {h.warn && <TriangleAlert aria-hidden className="size-3.5" />}
    {h.text}
  </span>
);

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function ReportsPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const [settled, setSettled] = useState<{ key: string; value: Settled } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { search } = useLocation();
  const filters = parseReportSearch(search);

  useEffect(() => {
    void fetchProjectBeads().then(
      (list: ProjectBeads[]) => setProjects({ status: "ok", names: list.filter((p) => p.exists).map((p) => p.name) }),
      (error: unknown) => setProjects({ status: "error", message: messageOf(error) }),
    );
  }, []);

  const names = projects.status === "ok" ? projects.names : [];
  const selected = filters.project === "all" || names.includes(filters.project) ? filters.project : (names[0] ?? "");
  const { days, sprint, tab } = filters;

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          {loaded.status === "ok" && (
            <p className="text-sm text-muted-foreground">
              Generated <time dateTime={loaded.report.generated_at}>{new Date(loaded.report.generated_at).toLocaleString()}</time>
            </p>
          )}
        </div>
        {selected !== "" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Project
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
          </label>
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
          {loaded.status === "ok" && loaded.report.errors.length > 0 && (
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
          <Tabs
            label="Report"
            tab={tab}
            onChange={(next) => change({ ...filters, project: selected, tab: next })}
            tabs={TABS.map((value) => ({
              value,
              label: LABELS[value],
              hint: loaded.status === "ok" ? hintOf(headlines(loaded.report)[value]) : undefined,
            }))}
          />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
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
              <p className="text-sm text-muted-foreground">Beads closed in the last {days} days, or the epics of a sprint</p>
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
                <Figures items={figures(tab, loaded.report)} />
                {tab === "delivery" && <DeliverySection delivery={loaded.report.delivery} />}
                {tab === "usage" && <UsageSection usage={loaded.report.usage} project={loaded.report.project} />}
                {tab === "quality" && <QualitySection quality={loaded.report.quality} />}
                {tab === "coverage" && <CoverageSection coverage={loaded.report.coverage} errors={loaded.report.errors} />}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
