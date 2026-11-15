import { Badge } from "@/components/ui/badge";
import type { BeadSummary } from "./api";

const LABELS = { technical: "Technical", parity: "Parity" } as const;

/** REQ-UI-109: a badge for a technical or parity epic; a capability epic and any other bead get none. */
export function KindBadge({ kind }: { kind: BeadSummary["kind"] }) {
  if (kind !== "technical" && kind !== "parity") return null;
  return (
    <Badge variant="secondary" className="shrink-0">
      {LABELS[kind]}
    </Badge>
  );
}
