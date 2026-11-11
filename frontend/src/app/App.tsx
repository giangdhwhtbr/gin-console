import { Fragment, lazy, Suspense, useState } from "react";
import { BeadDetailPage } from "@/features/beads/BeadDetailPage";
import { BeadsPage } from "@/features/beads/BeadsPage";
import { GraphPage } from "@/features/beads/GraphPage";
import { MilestonePage } from "@/features/milestones/MilestonePage";
import { MilestonesPage } from "@/features/milestones/MilestonesPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { QuotaPage } from "@/features/quota/QuotaPage";
import { SessionLogPage } from "@/features/sessions/SessionLogPage";
import { SessionsPage } from "@/features/sessions/SessionsPage";
import { useEmail } from "./identity";
import { Layout } from "./Layout";
import { LoginPage } from "./LoginPage";
import { useLocation } from "./route";

const ReportsPage = lazy(() => import("@/features/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));

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

function milestoneRoute(pathname: string): { project: string; id: string } | null {
  const match = /^\/milestones\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  try {
    return { project: decodeURIComponent(match[1]), id: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

export function App() {
  const { pathname } = useLocation();
  const [epoch, setEpoch] = useState(0); // a new key remounts the page, which loads its data again
  const log = logRoute(pathname);
  const graph = graphRoute(pathname);
  const bead = beadRoute(pathname);
  const milestone = milestoneRoute(pathname);
  const email = useEmail();
  if (email === null) return <LoginPage />;
  return (
    <Layout onRefreshed={() => setEpoch((n) => n + 1)}>
      <Fragment key={epoch}>
      {log !== null ? (
        <SessionLogPage key={`${log.project}/${log.id}`} project={log.project} id={log.id} />
      ) : graph !== null ? (
        <GraphPage key={`${graph.project}/${graph.id ?? ""}`} project={graph.project} id={graph.id} />
      ) : milestone !== null ? (
        <MilestonePage key={`${milestone.project}/${milestone.id}`} project={milestone.project} id={milestone.id} />
      ) : bead !== null ? (
        <BeadDetailPage key={`${bead.project}/${bead.id}`} project={bead.project} id={bead.id} />
      ) : pathname === "/sessions" ? (
        <SessionsPage />
      ) : pathname === "/beads" ? (
        <BeadsPage />
      ) : pathname === "/milestones" ? (
        <MilestonesPage />
      ) : pathname === "/quota" ? (
        <QuotaPage />
      ) : pathname === "/reports" ? (
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          <ReportsPage />
        </Suspense>
      ) : (
        <ProjectsPage />
      )}
      </Fragment>
    </Layout>
  );
}

