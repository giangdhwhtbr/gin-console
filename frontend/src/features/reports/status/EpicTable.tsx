import { Link } from "@/app/Link";
import { StateGlyph } from "@/components/StateGlyph";
import { Strand, toStrandCounts } from "@/components/Strand";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EpicPlan, ForecastEpic, MilestoneDetail } from "@/features/milestones/api";
import { verdictOf } from "@/features/milestones/gantt";
import { Verdict } from "@/features/milestones/Verdict";
import { formatDate, formatRange } from "@/lib/dates";
import { beadPath } from "../format";
import type { StatusEpic } from "./statusApi";

const HEADS = ["Epic", "Verdict", "Progress", "Planned", "Forecast", "Owner"] as const;

function compareRows(a: { epic: StatusEpic; plan: EpicPlan | null }, b: { epic: StatusEpic; plan: EpicPlan | null }): number {
  if (a.plan !== null && b.plan !== null) {
    const startDiff = a.plan.planned_start.localeCompare(b.plan.planned_start);
    if (startDiff !== 0) return startDiff;
  } else if (a.plan !== null) {
    return -1;
  } else if (b.plan !== null) {
    return 1;
  }
  return a.epic.id.localeCompare(b.epic.id);
}

/** REQ-REPORTS-031: epic table joining status epics with milestone detail verdicts/planned dates and list forecast dates. */
export function EpicTable({
  project,
  epics,
  detail,
  forecast,
  today,
}: {
  project: string;
  epics: readonly StatusEpic[];
  detail: MilestoneDetail | null;
  forecast: readonly ForecastEpic[] | null;
  today: string;
}) {
  const plans = new Map(detail?.epics.map((e) => [e.id, e]) ?? []);
  const forecasts = new Map(forecast?.map((e) => [e.id, e]) ?? []);
  const rows = epics.map((epic) => ({ epic, plan: plans.get(epic.id) ?? null })).sort(compareRows);

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">Epics</h3>
      <Table>
        <TableHeader>
          <TableRow>
            {HEADS.map((head) => (
              <TableHead key={head}>{head}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ epic, plan }) => {
            const closed = epic.status === "closed";
            const verdict = !closed && plan !== null ? verdictOf(plan, today, detail?.integration ?? null) : null;
            const planned = plan !== null ? formatRange(plan.planned_start, plan.planned_end, today) : "—";
            const fe = forecasts.get(epic.id);
            const forecastText = closed
              ? epic.closed_on !== null
                ? formatDate(epic.closed_on, today)
                : "—"
              : fe !== undefined
                ? `${formatDate(fe.planned_end, today)}${fe.estimate_source === "assumed" ? "?" : ""}`
                : "—";

            return (
              <TableRow key={epic.id}>
                <TableCell className="max-w-60">
                  <Link to={beadPath(project, epic.id)} title={epic.title} className="block truncate font-medium hover:text-identity">
                    {epic.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {closed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <StateGlyph state="done" size={10} />
                      Done
                    </span>
                  ) : plan === null ? (
                    "—"
                  ) : verdict !== null ? (
                    <Verdict verdict={verdict} />
                  ) : null}
                </TableCell>
                <TableCell>
                  {epic.child_counts.total === 0 ? (
                    <span className="text-xs text-muted-foreground">Not split yet</span>
                  ) : (
                    <Strand counts={toStrandCounts(epic.child_counts)} noun="tracks" maxWidth={120} />
                  )}
                </TableCell>
                <TableCell>{planned}</TableCell>
                <TableCell>{forecastText}</TableCell>
                <TableCell className={epic.person === "Unassigned" ? "text-muted-foreground" : undefined}>{epic.person}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
