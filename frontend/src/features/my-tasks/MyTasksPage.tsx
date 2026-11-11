import { useEffect, useState } from "react";
import { useEmail } from "@/app/identity";
import { Link } from "@/app/Link";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaleNote } from "@/features/beads/StaleNote";
import { StateMark } from "@/features/beads/StateMark";
import { TypeBadge } from "@/features/beads/TypeBadge";
import { loadMyTasks, type MyTasks } from "./load";

type Outcome =
  | { status: "error"; message: string }
  | { status: "ok"; data: MyTasks };
/** The outcome of one request, tagged with the request it answers. */
type Settled = { request: string; outcome: Outcome };
type State = { status: "loading" } | Outcome;

export function MyTasksPage() {
  const email = useEmail() ?? "";
  const { search } = useLocation();
  const closed = new URLSearchParams(search).get("closed") === "1";
  const [settled, setSettled] = useState<Settled | null>(null);
  const request = `${email}|${closed}`;
  const state: State = settled !== null && settled.request === request ? settled.outcome : { status: "loading" };

  useEffect(() => {
    let live = true;
    loadMyTasks(email, closed).then(
      (data) => {
        if (live) setSettled({ request, outcome: { status: "ok", data } });
      },
      (error: unknown) => {
        if (live) setSettled({ request, outcome: { status: "error", message: error instanceof Error ? error.message : String(error) } });
      },
    );
    return () => {
      live = false;
    };
  }, [email, closed, request]);

  const count = state.status === "ok" ? state.data.tasks.length : null;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">My Tasks</h1>
      <div className="flex items-center gap-4">
        {count !== null && <span className="text-sm text-muted-foreground">{count} {count === 1 ? "task" : "tasks"}</span>}
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={closed}
            onChange={(event) => navigate(event.target.checked ? "/my-tasks?closed=1" : "/my-tasks", { replace: true })}
            className="rounded border"
          />
          <span>Show closed</span>
        </label>
      </div>
      {state.status === "loading" && <p className="text-muted-foreground">Loading tasks…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && (
        <>
          <StaleNote projects={state.data.stale} />
          {state.data.failures.map((failure) => (
            <Alert key={failure.project} variant="destructive">
              <AlertTitle>{failure.project} could not be loaded</AlertTitle>
              <AlertDescription>{failure.message}</AlertDescription>
            </Alert>
          ))}
          {state.data.tasks.length === 0 ? (
            <p className="text-muted-foreground">No tasks assigned to {email}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.data.tasks.map(({ project, bead }) => (
                  <TableRow key={`${project}/${bead.id}`}>
                    <TableCell>{project}</TableCell>
                    <TableCell className="whitespace-normal">
                      <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`}>
                        <span className="font-mono text-xs text-muted-foreground">{bead.id}</span> {bead.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StateMark bead={bead} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <TypeBadge type={bead.issue_type} />
                    </TableCell>
                    <TableCell>P{bead.priority}</TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(bead.updated_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </section>
  );
}
