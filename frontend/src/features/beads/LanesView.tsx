import { useEffect, useRef } from "react";
import { Link } from "@/app/Link";
import { navigate } from "@/app/route";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { DetailsPanel } from "./DetailsPanel";
import { filtersToSearch, type BeadFilters } from "./filters";
import { ancestorsOf, hasChildren } from "./graph";
import { hasLanes, lanesOf } from "./lanes";
import { LanesCanvas } from "./LanesCanvas";
import type { MilestoneInEffect } from "./milestoneChoice";
import { scopeOf } from "./scope";
import { ScopeTrail } from "./ScopeTrail";

const enc = encodeURIComponent;

type Props = {
  project: string;
  /** Every loaded bead, closed ones, milestone beads and merge gates included. */
  beads: readonly BeadSummary[];
  /** The beads that pass search and filters, closed ones included. */
  matched: readonly BeadSummary[];
  milestone: MilestoneInEffect;
  filters: BeadFilters;
  /** Show the trail of containers above the view; an epic page's tab hides it (REQ-UI-119). */
  trail?: boolean;
  onChange: (next: BeadFilters) => void;
};

/** The lanes of one epic: a row per lane, cards on shared columns (REQ-UI-111). */
export function LanesView(props: Props) {
  const { beads, filters, milestone } = props;
  const scopeId = scopeOf(beads, filters, milestone);
  if (scopeId === null || !hasLanes(beads, scopeId)) {
    return (
      <p className="text-muted-foreground">
        <span>Lanes show for an epic whose tracks have lanes</span>{" "}
        <Link to={`/beads${filtersToSearch({ ...filters, view: "graph" })}`} className="prose-link">
          Show the Graph view
        </Link>
      </p>
    );
  }
  return <LanesBody key={scopeId} {...props} scopeId={scopeId} />;
}

function LanesBody({ project, beads, matched, milestone, filters, trail = true, onChange, scopeId }: Props & { scopeId: string }) {
  const board = lanesOf(beads, scopeId, new Set(matched.map((b) => b.id)), new Date());
  const cards = board.rows.flatMap((r) => r.cards.map((c) => c.bead.id));
  const asked = filters.select;
  const selected = asked !== "" && asked !== "none" && (cards.includes(asked) || asked === scopeId) ? asked : "";
  const tabStop = cards.includes(selected) ? selected : (cards[0] ?? "");
  // closing returns focus to the card that was selected, or to the tab stop when it is gone
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
  const plain = beads.filter((b) => b.issue_type !== "milestone");
  const rest = scopeId === milestone ? [] : [...ancestorsOf(plain, scopeId), scopeId];
  const top = milestone !== "all" && milestone !== "none" ? milestone : project;

  return (
    <div className={cn("grid gap-4", selected !== "" && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
      <div className="flex min-w-0 flex-col gap-3">
        {trail && <ScopeTrail label="Lanes scope" top={top} rest={rest} onScope={(scope) => onChange({ ...filters, scope, select: "" })} />}
        {board.cycle.length > 0 && (
          <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${board.cycle.join(", ")}`}</p>
        )}
        {cards.length === 0 ? (
          <p className="text-muted-foreground">No beads match these filters</p>
        ) : (
          <LanesCanvas
            board={board}
            beads={beads}
            selected={selected}
            tabStop={tabStop}
            onSelect={(id) => onChange({ ...filters, select: id })}
            onOpen={(id) =>
              hasChildren(beads, id)
                ? onChange({ ...filters, scope: id, select: "" })
                : navigate(`/beads/${enc(project)}/${enc(id)}`)
            }
            onEscape={() => onChange({ ...filters, select: "none" })}
          />
        )}
      </div>
      {selected !== "" && <DetailsPanel project={project} id={selected} onClose={close} />}
    </div>
  );
}
