import { Fragment, lazy, Suspense, useState } from "react";
import { BeadDetailPage } from "@/features/beads/BeadDetailPage";
import { BeadsPage } from "@/features/beads/BeadsPage";
import { OldGraphLink } from "@/features/beads/OldGraphLink";
import { MilestonePage } from "@/features/milestones/MilestonePage";
import { MilestonesPage } from "@/features/milestones/MilestonesPage";
import { JumpPalette } from "@/features/jump/JumpPalette";
import { MyTasksPage } from "@/features/my-tasks/MyTasksPage";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { useEmail } from "./identity";
import { HintProvider } from "@/components/HintProvider";
import { Layout } from "./Layout";
import { LoginPage } from "./LoginPage";
import { NotFoundPage } from "./NotFoundPage";
import { useLocation } from "./route";

const ReportsPage = lazy(() => import("@/features/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));

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
  const { pathname, search } = useLocation();
  const [epoch, setEpoch] = useState(0); // a new key remounts the page, which loads its data again
  const graph = graphRoute(pathname);
  const select = new URLSearchParams(search).get("select") ?? "";
  const bead = beadRoute(pathname);
  const milestone = milestoneRoute(pathname);
  const email = useEmail();
  if (email === null) return <LoginPage />;
  return (
    <HintProvider>
    <Layout onRefreshed={() => setEpoch((n) => n + 1)}>
      <Fragment key={epoch}>
      <JumpPalette />
      {graph !== null ? (
        <OldGraphLink key={`${graph.project}/${graph.id ?? ""}`} project={graph.project} id={graph.id} select={select} />
      ) : milestone !== null ? (
        <MilestonePage key={`${milestone.project}/${milestone.id}`} project={milestone.project} id={milestone.id} />
      ) : bead !== null ? (
        <BeadDetailPage key={`${bead.project}/${bead.id}`} project={bead.project} id={bead.id} />
      ) : pathname === "/beads" ? (
        <BeadsPage />
      ) : pathname === "/my-tasks" ? (
        <MyTasksPage />
      ) : pathname === "/milestones" ? (
        <MilestonesPage />
      ) : pathname === "/reports" || pathname.startsWith("/reports/") ? (
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          <ReportsPage />
        </Suspense>
      ) : pathname === "/" ? (
        <OverviewPage />
      ) : (
        <NotFoundPage path={pathname} />
      )}
      </Fragment>
    </Layout>
    </HintProvider>
  );
}

