import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";

const LABELS = { technical: "Technical", parity: "Parity" } as const;

/** REQ-UI-109, REQ-UI-140: the word for a technical or parity epic; a capability epic and any other bead get none. */
export function KindBadge({ kind, className }: { kind: BeadSummary["kind"]; className?: string }) {
  if (kind !== "technical" && kind !== "parity") return null;
  return (
    <span title={LABELS[kind]} className={cn("shrink-0 truncate text-xs text-muted-foreground", className)}>
      {LABELS[kind]}
    </span>
  );
}
