import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";
import type { BeadFilters } from "./filters";
import { GraphNodeButton } from "./GraphNode";
import { chainOf, edgeKey, edgePath, epicsOf, graphOf, place, step } from "./graph";

const KEYS = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"] as const;

export function GraphView({
  project,
  beads,
  filters,
  onChange,
}: {
  project: string;
  beads: readonly BeadSummary[];
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}) {
  const epics = epicsOf(beads, filters.closed);
  const chosen = epics.find((row) => row.epic.id === filters.epic);

  if (chosen === undefined) {
    return epics.length === 0 ? (
      <p className="text-muted-foreground">No epics</p>
    ) : (
      <ul aria-label="Epics" className="flex flex-col gap-2">
        {epics.map(({ epic, tasks, blocked }) => (
          <li key={epic.id}>
            <Button
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-2"
              onClick={() => onChange({ ...filters, epic: epic.id, select: "" })}
            >
              <span className="font-mono">{epic.id}</span>
              <span>{epic.title}</span>
              <span className="ml-auto text-muted-foreground">{`${tasks} tasks · ${blocked} blocked`}</span>
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  const graph = graphOf(beads, chosen.epic.id, filters.closed);
  const { at, width, height } = place(graph);
  const chain = at.has(filters.select) ? chainOf(graph, filters.select) : null;
  const tabStop = at.has(filters.select) ? filters.select : graph.nodes[0]?.bead.id;
  const select = (id: string) => onChange({ ...filters, select: id });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return select("");
    const key = KEYS.find((k) => k === event.key);
    const from = event.target instanceof HTMLElement ? event.target.dataset.node : undefined;
    if (key === undefined || from === undefined) return;
    const next = step(graph, from, key);
    if (next === null) return;
    event.preventDefault();
    Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-node]"))
      .find((el) => el.dataset.node === next)
      ?.focus();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => onChange({ ...filters, epic: "", select: "" })}>
            All epics
          </Button>
          <h2 className="font-medium">{`${chosen.epic.id} ${chosen.epic.title}`}</h2>
        </div>
        {graph.cycle.length > 0 && (
          <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${graph.cycle.join(", ")}`}</p>
        )}
        {graph.nodes.length === 0 ? (
          <p className="text-muted-foreground">This epic has no tasks</p>
        ) : (
          <>
            {graph.edges.length === 0 && (
              <p className="text-sm text-muted-foreground">No blocking relations between these tasks</p>
            )}
            <div className="overflow-x-auto rounded border" onKeyDown={onKeyDown}>
              <div className="relative" style={{ width, height }}>
                <svg aria-hidden width={width} height={height} className="absolute inset-0 text-muted-foreground">
                  <defs>
                    <marker id="graph-arrow" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {graph.edges.map((edge) => {
                    const from = at.get(edge.from);
                    const to = at.get(edge.to);
                    if (from === undefined || to === undefined) return null;
                    const hot = chain?.edges.has(edgeKey(edge)) ?? false;
                    return (
                      <path
                        key={edgeKey(edge)}
                        d={edgePath(from, to)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={hot ? 2 : 1}
                        markerEnd="url(#graph-arrow)"
                        className={cn(
                          "transition-opacity motion-reduce:transition-none",
                          hot && "text-foreground",
                          chain !== null && !hot && "opacity-30",
                        )}
                      />
                    );
                  })}
                </svg>
                {graph.nodes.map((node) => {
                  const position = at.get(node.bead.id);
                  return position === undefined ? null : (
                    <GraphNodeButton
                      key={node.bead.id}
                      node={node}
                      at={position}
                      selected={node.bead.id === filters.select}
                      dimmed={chain !== null && !chain.nodes.has(node.bead.id)}
                      tabStop={node.bead.id === tabStop}
                      onSelect={select}
                    />
                  );
                })}
              </div>
            </div>
            <ul className="sr-only">
              {graph.edges.map((edge) => (
                <li key={edgeKey(edge)}>{`${edge.to} is blocked by ${edge.from}`}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <aside aria-label="Bead details" className="min-w-0 rounded border p-3">
        {filters.select === "" ? (
          <p className="text-muted-foreground">Select a bead to see its details</p>
        ) : (
          <BeadDetailPage key={`${project}/${filters.select}`} project={project} id={filters.select} embedded />
        )}
      </aside>
    </div>
  );
}
