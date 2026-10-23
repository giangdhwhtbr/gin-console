import { Link } from "@/app/Link";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { CountBadge } from "./CountBadge";
import { stateOf } from "./graph";
import { StateMark, stateEdge } from "./StateMark";
import { TypeBadge } from "./TypeBadge";

export function BeadCard({ project, bead }: { project: string; bead: BeadSummary }) {
  return (
    <li data-card className={cn("flex flex-col gap-1.5 rounded border bg-card p-2.5 text-sm", stateEdge(stateOf(bead)))}>
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>{bead.id}</span>
        <span>{`P${bead.priority}`}</span>
      </div>
      <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`} className="font-medium">
        {bead.title}
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <StateMark bead={bead} />
        <TypeBadge type={bead.issue_type} />
        <CountBadge kind="comments" count={bead.comment_count} />
        <CountBadge kind="dependencies" count={bead.dependency_count} />
        {(bead.assignee ?? "") !== "" && <span className="text-muted-foreground">{bead.assignee}</span>}
      </div>
    </li>
  );
}
