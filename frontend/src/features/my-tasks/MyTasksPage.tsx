import { Fragment, useEffect, useState } from "react";
import { useEmail } from "@/app/identity";
import { Link } from "@/app/Link";
import { rememberOrigin } from "@/app/origin";
import { isUnknownProject, projectHref, rememberProject, resolveProject, useConfiguredProjects } from "@/app/project";
import { navigate, useLocation, useRestoreOnBack } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isClosedMilestone, matchesMilestone, milestoneInEffect } from "@/features/beads/milestoneChoice";
import { MilestoneFilter } from "@/features/beads/MilestoneFilter";
import { useMilestones } from "@/features/beads/useMilestones";
import { PullNote } from "@/features/beads/PullNote";
import { StaleNote } from "@/features/beads/StaleNote";
import { groupWork, type WorkGroup } from "./groups";
import { loadMyTasks, type MyTasks } from "./load";
import { MyWorkGroup } from "./MyWorkGroup";

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
  const asked = params.get("project") ?? "";
  const configured = useConfiguredProjects();
  const names = configured.status === "ok" ? configured.names : [];
  const unknown = configured.status === "ok" && isUnknownProject(asked, names);
  const project = configured.status === "ok" && !unknown ? resolveProject(asked, names) : "";
  usePageTitle("My work", project);

  // REQ-UI-124: the project shown is the current one, and the URL says which it is
  useEffect(() => {
    if (project === "") return;
    rememberProject(project);
    const now = new URLSearchParams(window.location.search);
    if (now.get("project") !== project && window.location.pathname === "/my-tasks") {
      now.set("project", project);
      navigate(`/my-tasks?${now.toString()}`, { replace: true });
    }
  }, [project, asked]);
  // REQ-UI-073: the place the breadcrumb of a bead page returns to
  useEffect(() => {
    if (project === "") return;
    const place = new URLSearchParams(search);
    place.set("project", project);
    rememberOrigin("my-tasks", "/my-tasks", `?${place.toString()}`, project);
  }, [search, project]);

  const milestones = useMilestones(project);
  const milestone = milestoneInEffect(params.get("milestone") ?? "", milestones);
  const fetchClosed = closed || isClosedMilestone(milestone, milestones);
  const [settled, setSettled] = useState<Settled | null>(null);
  const request = `${email}|${fetchClosed}|${project}`;
  const state: State =
    configured.status === "error"
      ? { status: "error", message: configured.message }
      : project === "" || settled === null || settled.request !== request
        ? { status: "loading" }
        : settled.outcome;

  useEffect(() => {
    if (project === "") return;
    let live = true;
    loadMyTasks(fetchClosed, project).then(
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

  useRestoreOnBack(state.status === "ok");
  const known = new Map((state.status === "ok" ? state.data.beads : []).map((bead) => [bead.id, bead]));
  // REQ-UI-150: groups are computed from every bead of the project, then the milestone filter narrows each one
  const groups: WorkGroup[] =
    state.status === "ok"
      ? groupWork(state.data.beads, email)
          .filter((group) => group.key !== "closed" || fetchClosed)
          .map((group) => ({ ...group, beads: group.beads.filter((bead) => matchesMilestone(bead, milestone)) }))
      : [];
  const count = state.status === "ok" ? groups.reduce((sum, group) => sum + group.beads.length, 0) : null;
  const noProjects = configured.status === "ok" && names.length === 0;
  const waiting = state.status === "loading" && !noProjects && !unknown;
  const change = (next: string) => {
    const query = new URLSearchParams({ project });
    if (next !== "") query.set("milestone", next);
    if (closed) query.set("closed", "1");
    navigate(`/my-tasks?${query.toString()}`, { replace: true });
  };

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">My work</h1>
      {project !== "" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {count !== null && <span className="text-sm text-muted-foreground">{count} {count === 1 ? "task" : "tasks"}</span>}
          <MilestoneFilter state={milestones} value={milestone} onChange={change} />
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={closed}
              onChange={(event) => {
                const query = new URLSearchParams(search);
                if (event.target.checked) query.set("closed", "1");
                else query.delete("closed");
                navigate(`/my-tasks?${query.toString()}`, { replace: true });
              }}
              className="rounded border"
            />
            <span>Show closed</span>
          </label>
        </div>
      )}
      {unknown && <UnknownProject name={asked} names={names} hrefOf={(name) => projectHref("/my-tasks", name)} />}
      {noProjects && <p className="text-muted-foreground">No projects configured.</p>}
      {waiting && <p className="text-muted-foreground">Loading tasks…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && (
        <>
          <StaleNote projects={state.data.stale} />
          <PullNote failures={state.data.pullFailures} />
          {state.data.failures.map((failure) => (
            <Alert key={failure.project} variant="destructive">
              <AlertTitle>{failure.project} could not be loaded</AlertTitle>
              <AlertDescription>{failure.message}</AlertDescription>
            </Alert>
          ))}
          {count === 0 ? (
            <p className="text-muted-foreground">
              <span>No work for {email}</span>{" "}
              <Link to={projectHref("/beads", project)} className="prose-link">
                Open the Beads page
              </Link>
            </p>
          ) : (
            <>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  {group.key === "mine" && <h2 className="text-base font-semibold">Next up</h2>}
                  <MyWorkGroup group={group} project={project} known={known} email={email} />
                </Fragment>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
