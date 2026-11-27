import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CaseCounts, ResultKey } from "./api";

const COLUMNS: readonly { key: ResultKey; label: string }[] = [
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
  { key: "blocked", label: "Blocked" },
  { key: "not_run", label: "Not run" },
  { key: "outdated", label: "Outdated" },
  { key: "other", label: "Other" },
];

/** REQ-QA-010: cases per capability or type by effective result; a count filters the list below. */
export function CountsTable({
  title,
  rows,
  groupKey,
  onPick,
}: {
  title: string;
  rows: readonly CaseCounts[];
  groupKey: "capability" | "type";
  onPick: (group: string, result: ResultKey) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h2 className="text-14 font-medium">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="capitalize">{groupKey}</TableHead>
            {COLUMNS.map(({ key, label }) => (
              <TableHead key={key} className="text-right">
                {label}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              {COLUMNS.map(({ key, label }) => (
                <TableCell key={key} className="text-right">
                  {row[key] === 0 ? (
                    <span className="text-muted-foreground">0</span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`${row.name} ${label.toLowerCase()}: ${row[key]}`}
                      onClick={() => onPick(row.name, key)}
                      className="min-w-8 cursor-pointer rounded px-1 underline decoration-dotted underline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {row[key]}
                    </button>
                  )}
                </TableCell>
              ))}
              <TableCell className="text-right">{row.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
