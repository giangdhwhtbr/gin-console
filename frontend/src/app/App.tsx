import { BeadDetailPage } from "@/features/beads/BeadDetailPage";
import { BeadsPage } from "@/features/beads/BeadsPage";
import { GraphPage } from "@/features/beads/GraphPage";
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

function graphRoute(pathname: string): { project: string; id: string | null } | null {
  const match = /^\/beads\/([^/]+)(?:\/([^/]+))?\/graph$/.exec(pathname);
  if (!match) return null;
  try {
    return { project: decodeURIComponent(match[1]), id: match[2] === undefined ? null : decodeURIComponent(match[2]) };
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
  const graph = graphRoute(pathname);
  const bead = beadRoute(pathname);
  return (
    <Layout>
      {log !== null ? (
        <SessionLogPage key={`${log.project}/${log.id}`} project={log.project} id={log.id} />
      ) : graph !== null ? (
        <GraphPage key={`${graph.project}/${graph.id ?? ""}`} project={graph.project} id={graph.id} />
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

