import { useEffect } from "react";
import { projectHref, resolveProject, useConfiguredProjects } from "./project";
import { navigate } from "./route";

/** REQ-UI-099: `/` replaces itself with My Tasks of the current project, or with plain `/my-tasks` when no project is configured. */
export function HomeRedirect() {
  const projects = useConfiguredProjects();
  const target = projects.status === "loading" ? null : projectHref("/my-tasks", resolveProject("", projects.status === "ok" ? projects.names : []));
  useEffect(() => {
    if (target !== null) navigate(target, { replace: true });
  }, [target]);
  return <p className="text-muted-foreground">Loading…</p>;
}
