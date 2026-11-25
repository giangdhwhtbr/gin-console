import { Link } from "./Link";
import { projectHref, resolveProject, useConfiguredProjects } from "./project";
import { usePageTitle } from "./usePageTitle";

/** REQ-UI-125: the address is not a page of the console. */
export function NotFoundPage({ path }: { path: string }) {
  const projects = useConfiguredProjects();
  usePageTitle("Page not found");
  const project = resolveProject("", projects.status === "ok" ? projects.names : []);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>
        <code className="break-all">{path}</code> is not a page of gin-console.
      </p>
      <ul className="flex gap-4">
        <li>
          <Link to={projectHref("/beads", project)} className="prose-link">
            Beads
          </Link>
        </li>
        <li>
          <Link to={projectHref("/my-tasks", project)} className="prose-link">
            My work
          </Link>
        </li>
      </ul>
    </section>
  );
}
