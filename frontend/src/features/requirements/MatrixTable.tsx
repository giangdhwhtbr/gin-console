import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Requirement } from "./api";
import { SIGNOFF_LABELS, STATUS_LABELS } from "./labels";

function withReq(search: string, id: string): string {
  const params = new URLSearchParams(search);
  params.set("req", id);
  return `/requirements/matrix?${params.toString()}`;
}

const statusText = (row: Requirement): string =>
  row.state === "removed" || row.status === null ? "Removed" : [STATUS_LABELS[row.status], ...row.reasons].join(", ");

const beadsText = (row: Requirement): string => (row.beads === null ? "unknown" : `${row.beads.filter((b) => b.status === "closed").length}/${row.beads.length}`);
const casesText = (row: Requirement): string => (row.cases === null ? "unknown" : `${row.cases.filter((c) => c.effective_result === "passed").length}/${row.cases.length}`);

/** REQ-REQUIREMENTS-013: one table per capability, one row per requirement. */
export function MatrixTable({ rows, selected, search }: { rows: readonly Requirement[]; selected: string | null; search: string }) {
  const capabilities = [...new Set(rows.map((r) => r.capability))];
  return (
    <div className="flex flex-col gap-4">
      {capabilities.map((capability) => (
        <section key={capability} className="flex flex-col gap-1">
          <h2 className="text-14 font-medium">{capability}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Id</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sign-off</TableHead>
                <TableHead>Beads</TableHead>
                <TableHead>Cases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows
                .filter((r) => r.capability === capability)
                .map((row) => (
                  <TableRow key={row.id} data-selected={row.id === selected ? "" : undefined}>
                    <TableCell className="font-mono text-13">
                      <Link to={withReq(search, row.id)} aria-current={row.id === selected ? "page" : undefined} className="hover:text-identity">
                        {row.id}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-normal">{row.title}</TableCell>
                    <TableCell className="whitespace-normal">{statusText(row)}</TableCell>
                    <TableCell>{SIGNOFF_LABELS[row.signoff.state]}</TableCell>
                    <TableCell>{beadsText(row)}</TableCell>
                    <TableCell>{casesText(row)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
