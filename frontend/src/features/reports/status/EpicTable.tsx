import { Link } from "@/app/Link";
import { StateGlyph } from "@/components/StateGlyph";
import { Strand, toStrandCounts } from "@/components/Strand";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ForecastEpic, MilestoneDetail } from "@/features/milestones/api";
import { Verdict } from "@/features/milestones/Verdict";
import { beadPath } from "../format";
import type { StatusEpic } from "./statusApi";
import { epicRows } from "./statusView";

const HEADS = ["Epic", "Verdict", "Progress", "Planned", "Forecast", "Owner"] as const;

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
  const rows = epicRows(epics, detail, forecast, today);

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
          {rows.map(({ epic, plan, closed, verdict, planned, forecast: forecastText }) => {
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
