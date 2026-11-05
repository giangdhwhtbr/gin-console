import { formatDays } from "./format";

export type Range = { key: string; n: number; median: number; p85: number };

const pct = (value: number, max: number) => `${(value / max) * 100}%`;
const COLOR = "var(--series-1)";

/** One row per key on a shared day axis: a dot at the median, a line to a tick at the 85th percentile. */
export function RangeChart({ title, ranges }: { title: string; ranges: Range[] }) {
  if (ranges.length === 0) {
    return (
      <figure className="flex flex-col gap-2">
        <figcaption className="text-sm text-muted-foreground">{title}</figcaption>
        <p className="text-sm text-muted-foreground">No data in this period</p>
      </figure>
    );
  }
  const max = Math.max(1, Math.ceil(Math.max(...ranges.map((r) => r.p85))));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm text-muted-foreground">{title}</figcaption>
      <ul className="flex flex-col gap-1">
        {ranges.map((r) => {
          const label = `${r.key}: ${r.n} beads, median ${formatDays(r.median)}, 85th percentile ${formatDays(r.p85)}`;
          return (
            <li key={r.key} tabIndex={0} aria-label={label} className="group relative grid grid-cols-[6rem_1fr] items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-ring">
              <span aria-hidden className="truncate text-right text-sm">{r.key}</span>
              <span aria-hidden className="relative h-5">
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2" style={{ left: pct(r.median, max), width: pct(r.p85 - r.median, max), background: COLOR }} />
                <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2" style={{ left: pct(r.p85, max), background: COLOR }} />
                <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: pct(r.median, max), background: COLOR }} />
              </span>
              <span role="tooltip" className="pointer-events-none absolute left-28 top-full z-10 hidden rounded border bg-popover p-2 text-xs text-popover-foreground group-hover:block group-focus:block">
                {label}
              </span>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="relative ml-[6.5rem] h-4 text-xs text-muted-foreground">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f} className="absolute -translate-x-1/2" style={{ left: `${f * 100}%` }}>
            {`${+(f * max).toFixed(1)}d`}
          </span>
        ))}
      </div>
    </figure>
  );
}
