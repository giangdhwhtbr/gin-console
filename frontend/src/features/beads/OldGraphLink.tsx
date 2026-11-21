import { useEffect } from "react";
import { navigate } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { BeadSummary } from "./api";
import { Breadcrumb } from "./Breadcrumb";
import { graphViewUrl, hasChildren } from "./graph";
import { useBeads } from "./useBeads";

const enc = encodeURIComponent;

/** Where an old Dependencies link now goes (REQ-UI-075); `null` when the bead is not among the beads. */
function targetOf(project: string, id: string | null, select: string, beads: readonly BeadSummary[]): string | null {
  if (id === null) return graphViewUrl(project, null, select);
  const found = beads.find((b) => b.id === id);
  if (found === undefined) return null;
  if (found.issue_type === "epic") return `/beads/${enc(project)}/${enc(id)}?tab=graph${select === "" ? "" : `&select=${enc(select)}`}`;
  if (hasChildren(beads, id)) return graphViewUrl(project, id, select);
  // scopeOf ignores a milestone scope, so a bead under a milestone is selected in the project's graph
  const parent = beads.find((b) => b.id === found.parent)?.issue_type === "milestone" ? null : found.parent;
  // an old `select` wins over the bead itself
  return graphViewUrl(project, parent, select === "" ? id : select);
}

/** An old Dependencies link: it replaces itself with the Graph view, the epic page or the bead's place in its parent's graph. */
export function OldGraphLink({ project, id, select }: { project: string; id: string | null; select: string }) {
  const { state, retry } = useBeads(project, true, true);
  const target = id === null ? graphViewUrl(project, null, select) : state.status === "ok" ? targetOf(project, id, select, state.beads) : null;
  useEffect(() => {
    if (target !== null) navigate(target, { replace: true });
  }, [target]);

  if (state.status === "error")
    return (
      <Alert variant="destructive">
        <AlertTitle>Beads could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          <span>{state.message}</span>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (state.status === "ok" && target === null)
    return (
      <section className="flex flex-col gap-4">
        <Breadcrumb project={project} id={id ?? ""} parent={null} />
        <p>Bead not found</p>
      </section>
    );
  return <p className="text-muted-foreground">Loading…</p>;
}
