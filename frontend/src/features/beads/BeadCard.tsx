import { shortId } from "@/lib/shortId";
import { Link } from "@/app/Link";
import { PriorityPill } from "@/components/PriorityPill";
import { SizeBadge } from "@/components/SizeBadge";
import type { BeadSummary } from "./api";
import { AssigneeName } from "./AssigneeName";
import { CountBadge } from "./CountBadge";
import { KindBadge } from "./KindBadge";
import { LaneChip } from "./LaneChip";
import { StateMark } from "./StateMark";
import { TypeBadge } from "./TypeBadge";

export function BeadCard({ project, bead }: { project: string; bead: BeadSummary }) {
  const short = shortId(bead.id);
  return (
    <li data-card data-id={bead.id} tabIndex={-1} className="flex flex-col gap-1.5 rounded border bg-card p-2.5 text-sm">
      <div className="flex items-center justify-between font-mono text-13 text-muted-foreground">
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
        {bead.lane !== null && <LaneChip lane={bead.lane} />}
        <SizeBadge points={bead.points} estimateMinutes={bead.estimate_minutes} />
        <CountBadge kind="comments" count={bead.comment_count} />
        <CountBadge kind="dependencies" count={bead.dependency_count} />
        <AssigneeName assignee={bead.assignee} className="text-muted-foreground wrap-anywhere" />
      </div>
    </li>
  );
}
