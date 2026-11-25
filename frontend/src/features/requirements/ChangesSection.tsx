import { Link } from "@/app/Link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequirementsFailure, type ChangeList, type ChangeRow } from "./api";
import { LEGACY_TEXT, signoffText } from "./labels";
import { changeHref } from "./paths";
import { RequirementsError } from "./RequirementsError";
import type { Fetched } from "./useFetched";

const counts = ({ added, modified, removed }: ChangeRow) => (added === null || modified === null || removed === null ? "Counts unknown" : `${added} added, ${modified} modified, ${removed} removed`);

function ChangeItem({ project, row }: { project: string; row: ChangeRow }) {
  return (
    <li className="flex min-w-0 flex-col gap-0.5 rounded-lg border p-3">
      <Link to={changeHref(project, row.folder)} className="prose-link font-medium [overflow-wrap:anywhere]">
        {row.title}
      </Link>
      {row.epic !== null && (
        <p className="text-sm">
          <span className="text-muted-foreground">Epic: </span>
          <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(row.epic)}`} className="prose-link">
            {row.epic}
          </Link>
        </p>
      )}
      <p className="text-sm text-muted-foreground">{`Sign-off: ${signoffText(row.signoff)}`}</p>
      <p className="text-sm text-muted-foreground">{counts(row)}</p>
    </li>
  );
}

function Group({ title, project, rows }: { title: string; project: string; rows: ChangeRow[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-16 font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">None.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <ChangeItem key={row.folder} project={project} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** REQ-REQUIREMENTS-016, 019: open changes, then archived ones; a failed trace leaves the list with Unknown sign-offs. */
export function ChangesSection({ project, legacy, list, retry }: { project: string; legacy: boolean; list: Fetched<ChangeList>; retry: () => void }) {
  if (list.status === "loading") return <p className="text-muted-foreground">Loading changes</p>;
  if (list.status === "error") return <RequirementsError error={list.error} onRetry={retry} />;
  const { changes, error, cause } = list.data;
  // The server reads the folders from disk, so an empty list with an error truly has no changes.
  const notice =
    error === null ? null : cause === null ? (
      <Alert variant="destructive" role="status">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    ) : (
      <RequirementsError error={new RequirementsFailure(error, 200, cause)} onRetry={retry} />
    );
  if (changes.length === 0)
    return (
      <div className="flex flex-col gap-3">
        {notice}
        <p>{legacy ? LEGACY_TEXT : "This project has no changes yet."}</p>
      </div>
    );
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {notice}
      <Group title="Open" project={project} rows={changes.filter((c) => c.archived === null)} />
      <Group title="Archived" project={project} rows={changes.filter((c) => c.archived !== null)} />
    </div>
  );
}
