import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { SessionLogPage } from "@/features/sessions/SessionLogPage";
import { SessionsPage } from "@/features/sessions/SessionsPage";
import { Layout } from "./Layout";
import { useLocation } from "./route";

function logRoute(pathname: string): { project: string; id: string } | null {
  const match = /^\/sessions\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  try {
    return { project: decodeURIComponent(match[1]), id: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

export function App() {
  const { pathname } = useLocation();
  const log = logRoute(pathname);
  return (
    <Layout>
      {log !== null ? (
        <SessionLogPage key={`${log.project}/${log.id}`} project={log.project} id={log.id} />
      ) : pathname === "/sessions" ? (
        <SessionsPage />
      ) : (
        <ProjectsPage />
      )}
    </Layout>
  );
}

