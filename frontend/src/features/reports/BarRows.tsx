export type Segment = { name: string; value: number; color: string };
export type BarRow = { key: string; segments: Segment[]; total: string; detail: string };

const sumOf = (row: BarRow) => row.segments.reduce((n, s) => n + s.value, 0);

/** Horizontal bars on one scale, stacked by segment; each row is focusable and shows its detail on hover and focus. */
export function BarRows({ rows }: { rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map(sumOf));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.key}
          tabIndex={0}
          aria-label={`${row.key}: ${row.detail}`}
          className="group relative grid grid-cols-[6rem_1fr] items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span aria-hidden className="truncate text-right text-sm">{row.key}</span>
          <span aria-hidden className="flex min-w-0 items-center gap-2">
            <span className="flex h-4 overflow-hidden rounded-sm" style={{ width: `${(sumOf(row) / max) * 85}%` }}>
              {row.segments
                .filter((s) => s.value > 0)
                .map((s) => (
                  <span key={s.name} className="border-r-2 border-background last:border-r-0" style={{ flexGrow: s.value, background: s.color }} />
                ))}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{row.total}</span>
          </span>
          <span role="tooltip" className="pointer-events-none absolute left-28 top-full z-10 hidden rounded border bg-popover p-2 text-xs text-popover-foreground group-hover:block group-focus:block">
            {row.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}
