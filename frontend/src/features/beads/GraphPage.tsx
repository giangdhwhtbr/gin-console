import { useEffect, useRef, useState } from "react";
import { Link } from "@/app/Link";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "./Breadcrumb";
import { DetailsPanel } from "./DetailsPanel";
import { GraphCanvas } from "./GraphCanvas";
import { ancestorsOf, graphFor, graphPath, hasChildren, progressOf, relationsOf } from "./graph";
import { useBeads } from "./useBeads";

const enc = encodeURIComponent;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function GraphPage({ project, id }: { project: string; id: string | null }) {
  const { state, retry } = useBeads(project, true);
  const { search } = useLocation();
  const [hideDone, setHideDone] = useState(false);
  const [onlyLinked, setOnlyLinked] = useState(id === null);
  const beads = state.status === "ok" ? state.beads : [];
  const here = graphPath(project, id);
  const focus = id ?? "";
  const asked = new URLSearchParams(search).get("select") ?? "";
  const select = (next: string) => navigate(next === focus ? here : `${here}?select=${enc(next)}`, { replace: true });
  // closing returns focus to the node that was selected, to the Scope button when that is the heading bar, else to the canvas tab stop
  const closed = useRef<string | null>(null);
  useEffect(() => {
    if (asked !== "none" || closed.current === null) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-node]"));
    (
      nodes.find((el) => el.dataset.node === closed.current) ??
      (closed.current === id ? document.querySelector<HTMLElement>('section[aria-label="Scope"] button[aria-pressed]') : null) ??
      nodes.find((el) => el.tabIndex === 0)
    )?.focus();
    closed.current = null;
  }, [asked, id]);
  const close = (selected: string) => {
    closed.current = selected;
    select("none");
  };
  const open = (next: string) => navigate(graphPath(project, next));
  const errorMessage = state.status === "error" ? state.message : state.status === "ok" ? state.error : null;

  const body = () => {
    if (id !== null && !beads.some((b) => b.id === id)) return <p>Bead not found</p>;
    if (id === null && beads.length === 0) return <p>No beads in this project</p>;
    const container = id === null || hasChildren(beads, id);
    const graph = graphFor(beads, id, { hideDone, onlyLinked: container && onlyLinked });
    const known = new Set(graph.nodes.map((n) => n.bead.id));
    const selected = asked === "none" ? "" : asked !== "" && (known.has(asked) || asked === id) ? asked : focus;
    const tabStop = known.has(selected) ? selected : (graph.nodes[0]?.bead.id ?? "");
    const inside = graph.nodes.filter((n) => !n.external).length;
    const progress = progressOf(beads).get(focus) ?? { done: 0, total: 0 };
    const scope = id === null ? null : beads.find((b) => b.id === id);
    const { blockers, blocked } = id === null ? { blockers: [], blocked: [] } : relationsOf(beads, id);
    const upstream = graph.edges.filter((e) => e.to === selected).map((e) => e.from);
    const downstream = graph.edges.filter((e) => e.from === selected).map((e) => e.to);
    const toLinks = (list: typeof blockers) =>
      list.map((b) => (
        <Link key={b.id} to={graphPath(project, b.id)} className="font-mono underline underline-offset-2">
          {b.id}
        </Link>
      ));

    return (
      <div className={cn("grid gap-4", selected !== "" && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
        <div className="flex min-w-0 flex-col gap-3">
          {container && (
            <section
              aria-label="Scope"
              className={cn("flex flex-col gap-1 rounded border p-3", id !== null && selected === id && "ring-2 ring-ring")}
            >
              {scope === null || scope === undefined ? (
                <h2 className="font-medium">{project}</h2>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/beads/${enc(project)}/${enc(scope.id)}`} className="font-mono underline underline-offset-2">
                    {scope.id}
                  </Link>
                  <button type="button" aria-pressed={selected === scope.id} onClick={() => select(scope.id)} className="text-left font-medium">
                    {scope.title}
                  </button>
                </div>
              )}
              <span className="text-sm text-muted-foreground">{`${progress.done} of ${progress.total} done`}</span>
              {blockers.length > 0 && <span className="flex flex-wrap gap-2 text-sm">Blocked by {toLinks(blockers)}</span>}
              {blocked.length > 0 && <span className="flex flex-wrap gap-2 text-sm">Blocks {toLinks(blocked)}</span>}
            </section>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" role="switch" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
              Hide done
            </label>
            {container && (
              <label className="flex items-center gap-2">
                <input type="checkbox" role="switch" checked={onlyLinked} onChange={(e) => setOnlyLinked(e.target.checked)} />
                Only linked
              </label>
            )}
            {graph.unlinked > 0 && <span className="text-muted-foreground">{`${graph.unlinked} without dependencies`}</span>}
          </div>
          {graph.cycle.length > 0 && (
            <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${graph.cycle.join(", ")}`}</p>
          )}
          {!container && graph.nodes.length <= 1 ? (
            <p className="flex gap-2">
              <span>No dependencies</span>
              <Link to={`/beads/${enc(project)}/${enc(focus)}`} className="font-mono underline underline-offset-2">
                {focus}
              </Link>
            </p>
          ) : container && inside === 0 ? (
            <p className="text-muted-foreground">{graph.unlinked > 0 ? "No dependencies between these beads" : "No beads to draw"}</p>
          ) : (
            <>
              {graph.edges.length === 0 && (
                <p className="text-sm text-muted-foreground">No blocking relations between these tasks</p>
              )}
              <GraphCanvas
                graph={graph}
                selected={selected}
                tabStop={tabStop}
                onSelect={select}
                onOpen={open}
                onEscape={() => select(selected !== "" && selected !== focus ? focus || "none" : "none")}
              />
            </>
          )}
          {known.has(selected) && (
            <div className="flex gap-2 lg:hidden">
              {upstream.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => select(upstream[0])}>
                  {plural(upstream.length, "blocker")}
                </Button>
              )}
              {downstream.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => select(downstream[0])}>
                  {`${downstream.length} blocked`}
                </Button>
              )}
            </div>
          )}
        </div>
        {selected !== "" && <DetailsPanel project={project} id={selected} graphScope={id} onClose={() => close(selected)} />}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <Breadcrumb project={project} id={focus} parent={null} graph={id === null ? [] : ancestorsOf(beads, id)} />
      {state.status === "loading" && <p className="text-muted-foreground">Loading beads…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Beads could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && body()}
    </section>
  );
}
