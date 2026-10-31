import { useState } from "react";
import { Link } from "@/app/Link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BeadSummary } from "@/features/beads/api";
import { StateMark } from "@/features/beads/StateMark";
import { useBeads } from "@/features/beads/useBeads";
import { cn } from "@/lib/utils";

const enc = encodeURIComponent;

/** REQ-MILESTONE-UI-010: epics without a parent. An epic in a milestone has it as parent; a child epic follows its parent epic. */
export function unassignedEpics(beads: BeadSummary[], showClosed: boolean): BeadSummary[] {
  return beads
    .filter((b) => b.issue_type === "epic" && b.parent === null && (showClosed || b.status !== "closed"))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

/** REQ-MILESTONE-UI-010: loads on its own, so a beads failure leaves the milestones above untouched. */
export function UnassignedEpics({ project }: { project: string }) {
  const [showClosed, setShowClosed] = useState(false);
  const { state, retry } = useBeads(project, showClosed);
  // filtering on `showClosed` too hides closed rows at once, before the refetch answers
  const rows = state.status === "ok" ? unassignedEpics(state.beads, showClosed) : [];
  return (
    <section aria-labelledby="unassigned-epics" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="unassigned-epics" className="font-semibold">
          {state.status === "ok" ? `Epics not in a milestone (${rows.length})` : "Epics not in a milestone"}
        </h2>
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} className="rounded border" />
          <span>Show closed</span>
        </label>
      </div>
      {state.status === "loading" && <p className="text-sm text-muted-foreground">Loading epics…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Epics couldn't be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.message}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && state.error !== null && (
        <p role="status" className="text-sm text-destructive">{`Refresh failed: ${state.error}`}</p>
      )}
      {state.status === "ok" &&
        (rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every epic is in a milestone.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{"Add them with /roadmap --milestone <id>."}</p>
            <ul aria-label="Epics not in a milestone" className="flex flex-col divide-y rounded border bg-card">
              {rows.map((epic) => (
                <li
                  key={epic.id}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm",
                    epic.status === "closed" && "text-muted-foreground",
                  )}
                >
                  <StateMark bead={epic} />
                  <span className="font-mono text-xs text-muted-foreground">{epic.id}</span>
                  <Link to={`/beads/${enc(project)}/${enc(epic.id)}`} className="min-w-0 truncate font-medium underline-offset-2 hover:underline">
                    {epic.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">{`P${epic.priority}`}</span>
                  {epic.labels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </li>
              ))}
            </ul>
          </>
        ))}
    </section>
  );
}
