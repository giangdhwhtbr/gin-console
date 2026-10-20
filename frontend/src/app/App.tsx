import { BeadDetailPage } from "@/features/beads/BeadDetailPage";
import { BeadsPage } from "@/features/beads/BeadsPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { QuotaPage } from "@/features/quota/QuotaPage";
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

function beadRoute(pathname: string): { project: string; id: string } | null {
  const match = /^\/beads\/([^/]+)\/([^/]+)$/.exec(pathname);
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
  const bead = beadRoute(pathname);
  return (
    <Layout>
      {log !== null ? (
        <SessionLogPage key={`${log.project}/${log.id}`} project={log.project} id={log.id} />
      ) : bead !== null ? (
        <BeadDetailPage key={`${bead.project}/${bead.id}`} project={bead.project} id={bead.id} />
      ) : pathname === "/sessions" ? (
        <SessionsPage />
      ) : pathname === "/beads" ? (
        <BeadsPage />
      ) : pathname === "/quota" ? (
        <QuotaPage />
      ) : (
        <ProjectsPage />
      )}
    </Layout>
  );
}

