import type { ReactNode } from "react";

/** One card of the epic Overview (REQ-UI-120): a titled section that never blocks its neighbours. */
export function OverviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** A label/value pair of REQ-UI-110: the value sits beside its label, drops under it when it does not fit, wraps instead of being cut, and may open a popup. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <dt className="w-16 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="m-0 min-w-0 text-sm font-medium wrap-anywhere text-foreground">{children}</dd>
    </div>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return <dl className="m-0 flex flex-col gap-1.5">{children}</dl>;
}
