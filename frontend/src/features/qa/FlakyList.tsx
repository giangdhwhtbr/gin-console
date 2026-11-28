import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { caseHref, type FlakyCase } from "./api";

/** REQ-QA-018: the cases whose result flipped, each linking to its case page. */
export function FlakyList({ project, rows }: { project: string; rows: readonly FlakyCase[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h2 className="text-14 font-medium">Flaky cases</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flaky cases</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Capability</TableHead>
              <TableHead className="text-right">Flips</TableHead>
              <TableHead>Last result</TableHead>
              <TableHead>Last run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.case}>
                <TableCell>
                  <Link to={caseHref(project, row.case)} className="prose-link font-mono">
                    {row.case}
                  </Link>
                </TableCell>
                <TableCell>{row.capability}</TableCell>
                <TableCell className="text-right">{row.flips}</TableCell>
                <TableCell>{row.last_result}</TableCell>
                <TableCell>{new Date(row.last_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
