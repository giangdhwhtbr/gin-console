import { useState, type ReactNode } from "react";
import { Hint } from "@/components/ui/tooltip";

const SHOWN = 10;

type AttentionRow = { key: string; id: string; content: ReactNode };

/** One list of Needs attention: its count and rule, 10 rows and "Show all" (REQ-OVERVIEW-009). `pending` replaces the count. */
export function AttentionSection({
  title,
  hint,
  rows,
  pending = null,
  footer = null,
}: {
  title: string;
  hint: string;
  rows: readonly AttentionRow[];
  pending?: string | null;
  footer?: ReactNode;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, SHOWN);
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="text-xl font-medium">
        <Hint text={hint}>
          <span tabIndex={0}>{pending === null ? `${title} (${rows.length})` : title}</span>
        </Hint>
      </h3>
      {pending !== null && <p className="text-sm text-muted-foreground">{pending}</p>}
      {pending === null && rows.length === 0 && footer === null && <p className="text-sm text-muted-foreground">None</p>}
      {shown.length > 0 && (
        <ul className="flex flex-col divide-y">
          {shown.map((row) => (
            <li key={row.key} data-id={row.id} tabIndex={-1} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
              {row.content}
            </li>
          ))}
        </ul>
      )}
      {!all && rows.length > SHOWN && (
        <button type="button" className="min-h-11 self-start text-13 font-medium hover:text-identity" onClick={() => setAll(true)}>
          Show all
        </button>
      )}
      {footer}
    </section>
  );
}
