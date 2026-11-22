import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFINITIONS } from "@/lib/definitions";
import type { Report } from "./api";
import { Figures } from "./Figures";
import { beadPath, formatPercent } from "./format";

const HINTS = { "Rework rate": DEFINITIONS.rework, Reopens: DEFINITIONS.reopens, "Bugs found later": DEFINITIONS.bugsFound } as const;

function Heads({ first }: { first: string }) {
  return (
    <TableHeader>
      <TableRow>
        {[first, "Closed", "Reopens", "Bugs", "Rework rate"].map((h) => (
          <TableHead key={h}>{h}</TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

const Empty = () => <p className="text-sm text-muted-foreground">No data in this period</p>;

/** REQ-UI-091: rework from the Beads interaction log and discovered-from links, by member and by epic. */
export function QualitySection({ report }: { report: Report }) {
  const { totals, quality } = report;
  const sum = (pick: (row: { reopens: number; bugs: number }) => number) => quality.members.reduce((n, row) => n + pick(row), 0);
  return (
    <div className="flex flex-col gap-8">
      <Figures
        hints={HINTS}
        items={[
          ["Rework rate", formatPercent(totals.rework_rate)],
          ["Reopens", String(sum((r) => r.reopens))],
          ["Bugs found later", String(sum((r) => r.bugs))],
        ]}
      />
      <section aria-labelledby="quality-members" className="flex min-w-0 flex-col gap-3">
        <h2 id="quality-members" className="font-semibold">Rework by member</h2>
        {quality.members.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <Heads first="Member" />
            <TableBody>
              {quality.members.map((r) => (
                <TableRow key={r.member}>
                  <TableCell>{r.member}</TableCell>
                  <TableCell>{r.closed}</TableCell>
                  <TableCell>{r.reopens}</TableCell>
                  <TableCell>{r.bugs}</TableCell>
                  <TableCell>{formatPercent(r.rework_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
      <section aria-labelledby="quality-epics" className="flex min-w-0 flex-col gap-3">
        <h2 id="quality-epics" className="font-semibold">Rework by epic</h2>
        {quality.epics.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <Heads first="Epic" />
            <TableBody>
              {quality.epics.map((r) => (
                <TableRow key={`${r.project}/${r.id}`}>
                  <TableCell>
                    <Link to={beadPath(r.project, r.id)} className="underline">
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell>{r.closed}</TableCell>
                  <TableCell>{r.reopens}</TableCell>
                  <TableCell>{r.bugs}</TableCell>
                  <TableCell>{formatPercent(r.rework_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
