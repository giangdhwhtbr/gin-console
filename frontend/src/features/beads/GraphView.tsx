import { useState } from "react";
import { navigate } from "@/app/route";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";
import type { BeadFilters } from "./filters";
import { GraphCanvas } from "./GraphCanvas";
import { ancestorsOf, hasChildren, keepWithAncestors, scopeGraph } from "./graph";
import type { MilestoneInEffect } from "./milestoneChoice";
import { SIDE_PANEL } from "./side-panel";

const enc = encodeURIComponent;

type Props = {
  project: string;
  /** Every loaded bead, milestone beads included. */
  beads: readonly BeadSummary[];
  /** The beads that pass search, filters and Show closed. */
  matched: readonly BeadSummary[];
  milestone: MilestoneInEffect;
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
};

/** The dependency graph of one container: a milestone, an epic, or the project (REQ-UI-106). */
export function GraphView(props: Props) {
  const { beads, milestone, filters } = props;
  const scopeId =
    filters.scope !== "" && hasChildren(beads, filters.scope) && beads.find((b) => b.id === filters.scope)?.issue_type !== "milestone"
      ? filters.scope
      : milestone !== "all" && milestone !== "none"
        ? milestone
        : null;
  return <GraphBody key={scopeId ?? ""} {...props} scopeId={scopeId} />;
}

function GraphBody({ project, beads, matched, milestone, filters, onChange, scopeId }: Props & { scopeId: string | null }) {
  const [onlyLinked, setOnlyLinked] = useState(scopeId === null);
  const graphBeads = scopeId === milestone ? beads : beads.filter((b) => b.issue_type !== "milestone");
  const graph = scopeGraph(graphBeads, scopeId, { hideDone: false, onlyLinked, keep: keepWithAncestors(beads, matched) });
  const known = new Set(graph.nodes.map((n) => n.bead.id));
  const focus = scopeId ?? "";
  const selected = filters.select !== "" && (known.has(filters.select) || filters.select === scopeId) ? filters.select : focus;
  const tabStop = known.has(selected) ? selected : (graph.nodes[0]?.bead.id ?? "");
  const to = (scope: string) => onChange({ ...filters, scope });
  // Milestone beads are never drawn outside their own scope, so the trail skips them; "" returns to the top item.
  const plain = beads.filter((b) => b.issue_type !== "milestone");
  const rest = scopeId === null || scopeId === milestone ? [] : [...ancestorsOf(plain, scopeId), scopeId];
  const top = milestone !== "all" && milestone !== "none" ? milestone : project;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <nav aria-label="Graph scope" className="flex flex-wrap items-center gap-2 text-sm">
          {[["", top], ...rest.map((id) => [id, id])].map(([id, label], i) => (
            <span key={id} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>›</span>}
              <button
                type="button"
                aria-current={i === rest.length ? "location" : undefined}
                onClick={() => to(id)}
                className="font-mono underline underline-offset-2"
              >
                {label}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" role="switch" checked={onlyLinked} onChange={(e) => setOnlyLinked(e.target.checked)} />
            Only linked
          </label>
          {graph.unlinked > 0 && <span className="text-muted-foreground">{`${graph.unlinked} without dependencies`}</span>}
          {scopeId === milestone && <span className="text-muted-foreground">Dashed nodes are outside this milestone.</span>}
        </div>
        {graph.cycle.length > 0 && (
          <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${graph.cycle.join(", ")}`}</p>
        )}
        {graph.nodes.length === 0 ? (
          <p className="text-muted-foreground">No beads match these filters</p>
        ) : (
          <GraphCanvas
            graph={graph}
            selected={selected}
            tabStop={tabStop}
            onSelect={(id) => onChange({ ...filters, select: id })}
            onOpen={(id) =>
              hasChildren(beads, id)
                ? onChange({ ...filters, scope: id, select: "" })
                : navigate(`/beads/${enc(project)}/${enc(id)}`)
            }
            onEscape={() => onChange({ ...filters, select: focus })}
          />
        )}
      </div>
      <aside aria-label="Bead details" tabIndex={0} className={cn("min-w-0 rounded border p-3", SIDE_PANEL)}>
        {selected === "" ? (
          <p className="text-muted-foreground">Select a bead to see its details</p>
        ) : (
          <BeadDetailPage key={`${project}/${selected}`} project={project} id={selected} embedded graphScope={scopeId} />
        )}
      </aside>
    </div>
  );
}
