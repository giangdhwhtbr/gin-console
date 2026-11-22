import { useEffect, useState } from "react";
import { isUnknownProject, projectHref, rememberProject, resolveProject } from "@/app/project";
import { navigate, useLocation } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { Legend } from "@/components/Legend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProjectBeads, isStale, pullError, pullOf, type ProjectBeads } from "@/features/projects/api";
import { BeadsView } from "./BeadsView";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";
import { rememberOrigin } from "@/app/origin";
import { PullNote, type PullFailure } from "./PullNote";
import { StaleNote } from "./StaleNote";

type Projects =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; names: string[]; stale: string[]; pullFailures: PullFailure[] };

export function BeadsPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const { search } = useLocation();
  const filters = parseFilters(search);

  useEffect(() => {
    void fetchProjectBeads().then(
      (list: ProjectBeads[]) => {
        const existing = list.filter((p) => p.exists);
        setProjects({ status: "ok", names: existing.map((p) => p.name), stale: existing.filter(isStale).map((p) => p.name),
          pullFailures: existing.flatMap((p) => {
            const pull = pullOf(p);
            return pull?.status === "error" ? [{ project: p.name, path: p.path, error: pullError(pull) }] : [];
          }),
        });
      },
      (error: unknown) =>
        setProjects({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  const change = (next: BeadFilters) => navigate(`/beads${filtersToSearch(next)}`, { replace: true });
  const names = projects.status === "ok" ? projects.names : [];
  const stale = projects.status === "ok" ? projects.stale : [];
  const pullFailures = projects.status === "ok" ? projects.pullFailures : [];
  const unknown = projects.status === "ok" && isUnknownProject(filters.project, names);
  const selected = projects.status === "ok" && !unknown ? resolveProject(filters.project, names) : "";
  usePageTitle("Beads", selected);

  // REQ-UI-124: the project shown is the current one, and the URL says which it is
  useEffect(() => {
    if (selected === "") return;
    rememberProject(selected);
    if (filters.project !== selected && window.location.pathname === "/beads") navigate(`/beads${filtersToSearch({ ...parseFilters(window.location.search), project: selected })}`, { replace: true });
  }, [selected, filters.project]);

  // the place the breadcrumb of a bead page returns to; the project is always in it, even when it is the default one
  useEffect(() => {
    if (selected !== "") rememberOrigin("beads", "/beads", filtersToSearch({ ...parseFilters(search), project: selected }), selected);
  }, [search, selected]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Beads</h1>
        <Legend />
      </div>
      {projects.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {projects.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{projects.message}</AlertDescription>
        </Alert>
      )}
      {projects.status === "ok" && names.length === 0 && (
        <p className="text-muted-foreground">No projects configured.</p>
      )}
      {unknown && <UnknownProject name={filters.project} names={names} hrefOf={(name) => projectHref("/beads", name)} />}
      {selected !== "" && (
        <>
          <StaleNote projects={stale.includes(selected) ? [selected] : []} />
          <PullNote failures={pullFailures.filter((failure) => failure.project === selected)} />
          <BeadsView key={selected} project={selected} filters={filters} onChange={change} />
        </>
      )}
    </section>
  );
}
