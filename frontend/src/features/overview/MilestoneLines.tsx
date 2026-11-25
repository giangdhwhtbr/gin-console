import { Link } from "@/app/Link";
import { StateGlyph } from "@/components/StateGlyph";
import { Hint } from "@/components/ui/tooltip";
import { fetchMilestones, milestonePath, type MilestoneList } from "@/features/milestones/api";
import { fetchStatus, selectedStatusMilestone, type StatusReport } from "@/features/reports/status/statusApi";
import { statusVerdict } from "@/features/reports/status/verdict";
import { DEFINITIONS } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import type { Named, ProjectOverview } from "./api";
import { useKeyed, type Answer } from "./useKeyed";

const LIMIT = 4;

const keyOf = (project: string, milestone: Named) => JSON.stringify([project, milestone.id]);

function parse(key: string): string[] {
  const parsed: unknown = JSON.parse(key);
  return Array.isArray(parsed) ? parsed.map(String) : ["", ""];
}

function loadStatus(key: string): Promise<StatusReport> {
  const [project, id] = parse(key);
  return fetchStatus(project, { kind: "milestone", id });
}

/** Keyed by milestone, not only by project: a new milestone must not read a list loaded before it was named (REQ-OVERVIEW-010). */
function loadForecast(key: string): Promise<MilestoneList> {
  return fetchMilestones(parse(key)[0]);
}

function Verdict({ id, report, forecast }: { id: string; report: StatusReport; forecast: Answer<MilestoneList> | undefined }) {
  const milestone = selectedStatusMilestone(report);
  if (milestone === null || milestone.id !== id) return <span className="text-muted-foreground">Status not available</span>;
  const unsplit = report.epics.filter((e) => e.status !== "closed" && e.child_counts.total === 0).length;
  const finish = forecast?.status === "ok" ? (forecast.data.milestones.find((m) => m.id === id)?.finish ?? null) : null;
  const verdict = statusVerdict(report, milestone, finish, unsplit);
  const warn = verdict.tone === "risk" || verdict.tone === "late";
  const note = forecast === undefined ? "Checking forecast" : forecast.status === "error" ? "Forecast not loaded" : null;
  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold whitespace-nowrap",
          warn ? "text-state-blocked" : verdict.tone === "good" ? "text-state-done" : "text-muted-foreground",
        )}
      >
        <StateGlyph state={verdict.glyph} size={14} color={warn ? "var(--state-blocked)" : undefined} className="flex-none" />
        {verdict.word}
      </span>
      <span className="min-w-0">{verdict.sentence}</span>
      {note !== null && <span className="text-xs text-muted-foreground">{note}</span>}
    </>
  );
}

function Status({ id, status, forecast }: { id: string; status: Answer<StatusReport> | undefined; forecast: Answer<MilestoneList> | undefined }) {
  if (status === undefined) return <span className="text-muted-foreground">Loading status…</span>;
  if (status.status === "error") return <span className="text-destructive">{status.message}</span>;
  return <Verdict id={id} report={status.data} forecast={forecast} />;
}

/** REQ-OVERVIEW-007: one line per readable project with the verdict of its milestone, first without its forecast. */
export function MilestoneLines({ projects }: { projects: readonly ProjectOverview[] }) {
  const readable = projects.filter((p) => p.error === null);
  const keys = readable.flatMap((p) => (p.milestone === null ? [] : [keyOf(p.name, p.milestone)]));
  const status = useKeyed(keys, loadStatus, LIMIT);
  const forecast = useKeyed(keys.filter((key) => status.get(key)?.status === "ok"), loadForecast, LIMIT);
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="text-xl font-semibold">
        <Hint text={DEFINITIONS.overviewMilestones}>
          <span tabIndex={0}>Milestones</span>
        </Hint>
      </h2>
      <ul className="flex flex-col divide-y">
        {readable.map(({ name, milestone }) => {
          const key = milestone === null ? "" : keyOf(name, milestone);
          return (
            <li key={name} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
              <span className="text-xs text-muted-foreground">{name}</span>
              {milestone === null ? (
                <span className="text-muted-foreground">No open milestone</span>
              ) : (
                <>
                  <Link to={milestonePath(name, milestone.id)} className="min-w-0 hover:text-identity">
                    {milestone.title}
                  </Link>
                  <Status id={milestone.id} status={status.get(key)} forecast={forecast.get(key)} />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
