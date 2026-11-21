import { useEffect, type ReactNode } from "react";
import { Link } from "./Link";
import { rememberProject, useConfiguredProjects } from "./project";

/** REQ-UI-126: names a project that is not configured and offers the configured ones, instead of showing another project. */
export function UnknownProject({ name, names, hrefOf }: { name: string; names: readonly string[]; hrefOf: (project: string) => string }) {
  return (
    <div role="status" className="flex flex-col items-start gap-2 text-sm">
      <p>{`No project ${name} is configured`}</p>
      {names.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {names.map((project) => (
            <li key={project}>
              <Link to={hrefOf(project)} className="underline underline-offset-2">
                {project}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** REQ-UI-126, REQ-UI-124: a page of one project, from its path. Unknown: the notice, and the current project stays. Known: it becomes current. */
export function ProjectGuard({ project, hrefOf, children }: { project: string; hrefOf: (project: string) => string; children: ReactNode }) {
  const projects = useConfiguredProjects();
  const known = projects.status === "ok" && projects.names.includes(project);
  useEffect(() => {
    if (known) rememberProject(project);
  }, [known, project]);
  if (projects.status === "loading") return <p className="text-muted-foreground">Loading projects…</p>;
  if (projects.status === "ok" && !known) return <UnknownProject name={project} names={projects.names} hrefOf={hrefOf} />;
  return <>{children}</>; // a list that could not be loaded does not hide the page
}
