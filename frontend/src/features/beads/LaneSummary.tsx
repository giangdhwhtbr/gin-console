import type { CSSProperties } from "react";
import { Link } from "@/app/Link";
import type { BeadSummary } from "./api";
import { laneSlots } from "./laneGraph";
import { GRAPH_STATE_OF, type LaneRow } from "./lanes";
import { gateState, gateWords, isMergeGate } from "./mergeGates";
import { StateWord } from "./StateMark";

type RowStyle = CSSProperties & Record<"--box", string>;

/** "waits for be #2 (merge pending), fe #3 (merged)" for the merge gates of the first open track of the lane. */
function waitsFor(row: LaneRow, byId: ReadonlyMap<string, BeadSummary>): string | null {
  const first = row.cards.find((c) => c.bead.status !== "closed")?.bead;
  const gates = (first?.blocked_by ?? []).flatMap((id) => {
    const gate = byId.get(id);
    return gate?.waits_for != null && isMergeGate(gate) ? [`${gateWords(gate.waits_for)} (${gateState(gate.status) === "Merged" ? "merged" : "merge pending"})`] : [];
  });
  return gates.length === 0 ? null : `waits for ${gates.join(", ")}`;
}

/** REQ-UI-121: one row per lane in the order of the Lanes view, tinted by the lane colour of REQ-UI-118. */
export function LaneSummary({ beads, epicId, rows, lanesHref }: { beads: readonly BeadSummary[]; epicId: string; rows: readonly LaneRow[]; lanesHref: string }) {
  const slots = laneSlots(beads, epicId);
  const byId = new Map(beads.map((b) => [b.id, b]));
  return (
    <section aria-labelledby="overview-lanes" className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 id="overview-lanes" className="m-0 text-base font-bold">
          Lanes
        </h2>
        <Link to={lanesHref} className="text-xs underline underline-offset-2">
          Open the Lanes tab →
        </Link>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {rows.flatMap((row) => {
          if (row.lane === null || row.state === null) return [];
          const style: RowStyle = { "--box": `var(--lane-${slots.get(row.lane) ?? 1})` };
          const waits = waitsFor(row, byId);
          const holder = row.holders.length > 0 ? row.holders.join(", ") : "Unclaimed";
          const meta = [row.state.kind === "closed" && row.holders.length === 0 ? null : holder, row.lease === null ? null : `lease ${row.lease.text}`, waits].filter((p) => p !== null).join(" · ");
          return [
            <li
              key={row.lane}
              data-lane={row.lane}
              style={style}
              className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[color-mix(in_srgb,var(--box)_55%,transparent)] bg-[color-mix(in_srgb,var(--box)_9%,var(--card))] px-3 py-2 text-sm dark:border-[color-mix(in_srgb,var(--box)_60%,transparent)] dark:bg-[color-mix(in_srgb,var(--box)_16%,var(--card))]"
            >
              <span aria-hidden data-swatch className="size-2.5 shrink-0 rounded-[3px] bg-(--box)" />
              <b className="w-16 min-w-0 truncate" title={row.lane}>
                {row.lane}
              </b>
              <StateWord state={GRAPH_STATE_OF[row.state.kind]} words={row.state.words} className="shrink-0 text-xs" />
              <span className="min-w-0 flex-1 basis-48 text-xs wrap-anywhere text-muted-foreground">
                {meta}
              </span>
              <b className="ml-auto shrink-0">{`${row.tracks.closed}/${row.tracks.total} closed`}</b>
            </li>,
          ];
        })}
      </ul>
    </section>
  );
}
