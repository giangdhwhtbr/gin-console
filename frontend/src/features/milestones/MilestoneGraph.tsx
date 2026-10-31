import { useState } from "react";
import { navigate } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GraphCanvas } from "@/features/beads/GraphCanvas";
import { scopeGraph } from "@/features/beads/graph";
import { useBeads } from "@/features/beads/useBeads";

const enc = encodeURIComponent;

/** REQ-MILESTONE-UI-002: the Dependencies graph scoped to the milestone; beads outside it are external nodes. */
export function MilestoneGraph({ project, id }: { project: string; id: string }) {
  const { state, retry } = useBeads(project, true, true); // the milestone must be loaded to scope on it
  const [selected, setSelected] = useState("");
  if (state.status === "loading") return <p className="text-muted-foreground">Loading beads…</p>;
  if (state.status === "error") {
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
  }
  const graph = scopeGraph(state.beads, id, { hideDone: false, onlyLinked: false });
  if (graph.nodes.length === 0) return <p className="text-muted-foreground">No epics in this milestone.</p>;
  const known = new Set(graph.nodes.map((n) => n.bead.id));
  const tabStop = known.has(selected) ? selected : graph.nodes[0].bead.id;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Dashed nodes are outside this milestone.</p>
      {graph.cycle.length > 0 && (
        <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${graph.cycle.join(", ")}`}</p>
      )}
      <GraphCanvas
        graph={graph}
        selected={selected}
        tabStop={tabStop}
        onSelect={setSelected}
        onOpen={(bead) => navigate(`/beads/${enc(project)}/${enc(bead)}`)}
        onEscape={() => setSelected("")}
      />
    </div>
  );
}
