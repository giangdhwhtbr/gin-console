import type { Totals } from "./api";
import { formatCost, formatPercent, formatTokens } from "./format";

export function KpiRow({ totals }: { totals: Totals }) {
  const tiles: [string, string][] = [
    ["Tokens", formatTokens(totals.tokens)],
    ["Estimated cost", formatCost(totals.cost)],
    ["Closed beads", String(totals.closed)],
    ["Tokens per bead", totals.tokens_per_bead === null ? "—" : formatTokens(totals.tokens_per_bead)],
    ["Rework rate", formatPercent(totals.rework_rate)],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      ))}
    </div>
  );
}
