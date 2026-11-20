import { useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "@/app/route";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { DetailsPanel } from "./DetailsPanel";
import type { BeadFilters } from "./filters";
import { GraphCanvas } from "./GraphCanvas";
import { ancestorsOf, hasChildren, keepWithAncestors, scopeGraph } from "./graph";
import { laneGraph } from "./laneGraph";
import { LaneGraphCanvas } from "./LaneGraphCanvas";
import { hasLanes } from "./lanes";
import { scopeOf } from "./scope";
import { ScopeTrail } from "./ScopeTrail";
import type { MilestoneInEffect } from "./milestoneChoice";

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
  const scopeId = scopeOf(beads, filters, milestone);
  return <GraphBody key={scopeId ?? ""} {...props} scopeId={scopeId} />;
}

function GraphBody({ project, beads, matched, milestone, filters, onChange, scopeId }: Props & { scopeId: string | null }) {
  const [onlyLinked, setOnlyLinked] = useState(scopeId === null);
  const graphBeads = scopeId === milestone ? beads : beads.filter((b) => b.issue_type !== "milestone");
  const keep = useMemo(() => keepWithAncestors(beads, matched), [beads, matched]);
  // REQ-UI-117: a scope with lanes draws a box per lane instead of the layers
  const lanes = useMemo(() => (scopeId !== null && hasLanes(beads, scopeId) ? laneGraph(beads, scopeId, keep, new Date()) : null), [beads, scopeId, keep]);
  const graph = lanes === null ? scopeGraph(graphBeads, scopeId, { hideDone: false, onlyLinked, keep }) : null;
  const ids = graph !== null ? graph.nodes.map((n) => n.bead.id) : (lanes?.cards.map((c) => c.bead.id) ?? []);
  const known = new Set(ids);
  const asked = filters.select;
  const selected = asked !== "" && asked !== "none" && (known.has(asked) || asked === scopeId) ? asked : "";
  const tabStop = known.has(selected) ? selected : (ids[0] ?? "");
  // closing returns focus to the node that was selected, or to the canvas tab stop when it is gone
  const closed = useRef<string | null>(null);
  useEffect(() => {
    if (selected !== "" || closed.current === null) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-node]"));
    (nodes.find((el) => el.dataset.node === closed.current) ?? nodes.find((el) => el.tabIndex === 0))?.focus();
    closed.current = null;
  }, [selected]);
  const close = () => {
    closed.current = selected;
    onChange({ ...filters, select: "none" });
  };
  const to = (scope: string) => onChange({ ...filters, scope, select: "" });
  // Milestone beads are never drawn outside their own scope, so the trail skips them; "" returns to the top item.
  const plain = beads.filter((b) => b.issue_type !== "milestone");
  const rest = scopeId === null || scopeId === milestone ? [] : [...ancestorsOf(plain, scopeId), scopeId];
  const top = milestone !== "all" && milestone !== "none" ? milestone : project;

  const cycle = graph !== null ? graph.cycle : (lanes?.cycle ?? []);
  const handlers = {
    onSelect: (id: string) => onChange({ ...filters, select: id }),
    onOpen: (id: string) =>
      hasChildren(beads, id) ? onChange({ ...filters, scope: id, select: "" }) : navigate(`/beads/${enc(project)}/${enc(id)}`),
    onEscape: () => onChange({ ...filters, select: "none" }),
  };

  return (
    <div className={cn("grid gap-4", selected !== "" && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
      <div className="flex min-w-0 flex-col gap-3">
        <ScopeTrail label="Graph scope" top={top} rest={rest} onScope={to} />
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {lanes === null && (
            <label className="flex items-center gap-2">
              <input type="checkbox" role="switch" checked={onlyLinked} onChange={(e) => setOnlyLinked(e.target.checked)} />
              Only linked
            </label>
          )}
          {graph !== null && graph.unlinked > 0 && <span className="text-muted-foreground">{`${graph.unlinked} without dependencies`}</span>}
          {scopeId === milestone && <span className="text-muted-foreground">Dashed nodes are outside this milestone.</span>}
        </div>
        {cycle.length > 0 && <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${cycle.join(", ")}`}</p>}
        {ids.length === 0 ? (
          <p className="text-muted-foreground">No beads match these filters</p>
        ) : lanes !== null ? (
          <LaneGraphCanvas graph={lanes} beads={beads} selected={selected} tabStop={tabStop} {...handlers} />
        ) : graph !== null ? (
          <GraphCanvas graph={graph} selected={selected} tabStop={tabStop} {...handlers} />
        ) : null}
      </div>
      {selected !== "" && <DetailsPanel project={project} id={selected} graphScope={scopeId} onClose={close} />}
    </div>
  );
}
