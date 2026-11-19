import { shortId } from "@/lib/shortId";
import { Link } from "@/app/Link";
import { PriorityPill } from "@/components/PriorityPill";
import { SizeBadge } from "@/components/SizeBadge";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { CountBadge } from "./CountBadge";
import { stateOf } from "./graph";
import { KindBadge } from "./KindBadge";
import { StateMark, stateEdge } from "./StateMark";
import { TypeBadge } from "./TypeBadge";

export function BeadCard({ project, bead }: { project: string; bead: BeadSummary }) {
  const short = shortId(bead.id);
  return (
    <li data-card className={cn("flex flex-col gap-1.5 rounded border bg-card p-2.5 text-sm", stateEdge(stateOf(bead)))}>
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span title={bead.id} aria-hidden={short !== bead.id || undefined}>
          {short}
        </span>
        {short !== bead.id && <span className="sr-only">{bead.id}</span>}
        <PriorityPill priority={bead.priority} />
      </div>
      <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`} className="font-medium wrap-anywhere">
        {bead.title}
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <StateMark bead={bead} />
        <TypeBadge type={bead.issue_type} />
        <KindBadge kind={bead.kind} />
        <SizeBadge points={bead.points} estimateMinutes={bead.estimate_minutes} />
        <CountBadge kind="comments" count={bead.comment_count} />
        <CountBadge kind="dependencies" count={bead.dependency_count} />
        {(bead.assignee ?? bead.owner ?? "") !== "" && (
          <span className="text-muted-foreground wrap-anywhere">{bead.assignee ?? bead.owner}</span>
        )}
      </div>
    </li>
  );
}
