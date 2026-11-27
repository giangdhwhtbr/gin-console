import { Link } from "@/app/Link";
import { caseHref, type CaseRow } from "./api";

/** REQ-QA-010: the cases, each linking to its page; a failed case links to its bug. */
export function CaseList({ project, cases }: { project: string; cases: readonly CaseRow[] }) {
  return (
    <ul aria-label="Cases" className="flex flex-col divide-y rounded border">
      {cases.map((row) => (
        <li key={row.id} className="flex min-w-0 flex-col gap-1 p-3 text-sm">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <Link to={caseHref(project, row.id)} className="prose-link font-mono">
              {row.id}
            </Link>
            <span className="min-w-0 break-words">{row.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>{row.type}</span>
            <span>{row.priority}</span>
            <span className="font-medium text-foreground">{row.effective_result}</span>
            {row.result !== row.effective_result && <span>{`Last recorded: ${row.result}`}</span>}
            {row.effective_result === "failed" && row.bug !== null && (
              <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(row.bug)}`} className="prose-link">
                {row.bug}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
