import { useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProjects, type Project } from "@/features/projects/api";
import { BeadsView } from "./BeadsView";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";
import { graphPath } from "./graph";
import { rememberSearch } from "./returnState";

type Projects =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; names: string[] };

export function BeadsPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const { search } = useLocation();
  const filters = parseFilters(search);

  useEffect(() => {
    void fetchProjects().then(
      (list: Project[]) =>
        setProjects({ status: "ok", names: list.filter((p) => p.exists).map((p) => p.name) }),
      (error: unknown) =>
        setProjects({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  const change = (next: BeadFilters) => navigate(`/beads${filtersToSearch(next)}`, { replace: true });
  const names = projects.status === "ok" ? projects.names : [];
  // the default is not written back into the URL
  const selected = names.includes(filters.project) ? filters.project : (names[0] ?? "");

  // the place the breadcrumb of a bead page returns to; the project is always in it, even when it is the default one
  useEffect(() => {
    if (selected !== "") rememberSearch(filtersToSearch({ ...parseFilters(search), project: selected }));
  }, [search, selected]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Beads</h1>
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
      {selected !== "" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              Project
              <select
                value={selected}
                onChange={(event) => change({ ...filters, project: event.target.value })}
                className="rounded border bg-background px-2 py-1"
              >
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <Link to={graphPath(selected, null)} className="text-sm underline underline-offset-2">
              Dependencies
            </Link>
          </div>
          <BeadsView key={selected} project={selected} filters={filters} onChange={change} />
        </>
      )}
    </section>
  );
}
