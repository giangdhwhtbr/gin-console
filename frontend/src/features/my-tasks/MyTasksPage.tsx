import { useEffect, useState } from "react";
import { useEmail } from "@/app/identity";
import { Link } from "@/app/Link";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isClosedMilestone, matchesMilestone, milestoneInEffect } from "@/features/beads/milestoneChoice";
import { MilestoneFilter } from "@/features/beads/MilestoneFilter";
import { useMilestones } from "@/features/beads/useMilestones";
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
  const params = new URLSearchParams(search);
  const closed = params.get("closed") === "1";
  const project = params.get("project") ?? "";
  const milestones = useMilestones(project);
  const milestone = project === "" ? "all" : milestoneInEffect(params.get("milestone") ?? "", milestones);
  const fetchClosed = closed || isClosedMilestone(milestone, milestones);
  const [settled, setSettled] = useState<Settled | null>(null);
  const request = `${email}|${fetchClosed}|${project}`;
  const state: State = settled !== null && settled.request === request ? settled.outcome : { status: "loading" };

  useEffect(() => {
    let live = true;
    loadMyTasks(email, fetchClosed, project).then(
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
  }, [email, fetchClosed, project, request]);

  const tasks = state.status === "ok" ? state.data.tasks.filter((task) => matchesMilestone(task.bead, milestone)) : [];
  const count = state.status === "ok" ? tasks.length : null;
  const projects = state.status === "ok" ? state.data.projects : project === "" ? [] : [project];
  const go = (next: { project: string; milestone?: string }) => {
    const query = new URLSearchParams();
    if (next.project !== "") query.set("project", next.project);
    if (next.milestone !== undefined) query.set("milestone", next.milestone);
    if (closed) query.set("closed", "1");
    const text = query.toString();
    navigate(text === "" ? "/my-tasks" : `/my-tasks?${text}`, { replace: true });
  };

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">My Tasks</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {count !== null && <span className="text-sm text-muted-foreground">{count} {count === 1 ? "task" : "tasks"}</span>}
        <label className="flex min-w-0 max-w-full items-center gap-1 text-sm">
          Project
          <select
            aria-label="Project"
            value={project}
            onChange={(event) => go({ project: event.target.value })}
            className="min-w-0 max-w-full truncate rounded border bg-background px-2 py-1"
          >
            <option value="">All projects</option>
            {projects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <MilestoneFilter
          state={milestones}
          value={milestone}
          disabled={project === ""}
          onChange={(value) => go({ project, milestone: value })}
        />
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={closed}
            onChange={(event) => {
              const query = new URLSearchParams(search);
              if (event.target.checked) query.set("closed", "1");
              else query.delete("closed");
              const text = query.toString();
              navigate(text === "" ? "/my-tasks" : `/my-tasks?${text}`, { replace: true });
            }}
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
          {tasks.length === 0 ? (
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
                {tasks.map(({ project, bead }) => (
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
