import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { caseHref, type FixStats, type Trends } from "./api";
import { formatDuration, sinceText } from "./duration";

const median = (stats: FixStats) => (stats.fixes === 0 || stats.median_seconds === null ? "No fix yet" : formatDuration(stats.median_seconds));

/** REQ-QA-018: the median time from a failure to the next pass, per capability, and the cases still failing. */
export function TimeToFix({ project, data }: { project: string; data: Trends["time_to_fix"] & { still_failing: Trends["still_failing"] } }) {
  const now = new Date();
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-14 font-medium">Time to fix</h2>
      <p className="text-sm">
        Median <span className="font-medium">{median(data.overall)}</span> over {data.overall.fixes} {data.overall.fixes === 1 ? "fix" : "fixes"}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Capability</TableHead>
            <TableHead className="text-right">Fixes</TableHead>
            <TableHead>Median</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.by_capability.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right">{row.fixes}</TableCell>
              <TableCell>{median(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <h3 className="text-sm font-medium">Still failing</h3>
      {data.still_failing.length === 0 ? (
        <p className="text-sm text-muted-foreground">No case is failing</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Capability</TableHead>
              <TableHead>Failing for</TableHead>
              <TableHead>Bug</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.still_failing.map((row) => (
              <TableRow key={row.case}>
                <TableCell>
                  <Link to={caseHref(project, row.case)} className="prose-link font-mono">
                    {row.case}
                  </Link>
                </TableCell>
                <TableCell>{row.capability}</TableCell>
                <TableCell>{sinceText(row.failing_since, now)}</TableCell>
                <TableCell>
                  {row.bug === null ? (
                    "—"
                  ) : (
                    <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(row.bug)}`} className="prose-link">
                      {row.bug}
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
