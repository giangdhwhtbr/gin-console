import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import type { BeadSummary } from "./api";

export function BeadCard({ project, bead }: { project: string; bead: BeadSummary }) {
  return (
    <li data-card className="flex flex-col gap-1 rounded border bg-card p-2 text-sm">
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>{bead.id}</span>
        <span>{`P${bead.priority}`}</span>
      </div>
      <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`} className="font-medium">
        {bead.title}
      </Link>
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Badge variant="outline">{bead.issue_type}</Badge>
        {(bead.assignee ?? "") !== "" && <span>{bead.assignee}</span>}
        <span>{`${bead.dependency_count} deps`}</span>
        <span>{`${bead.comment_count} comments`}</span>
      </div>
    </li>
  );
}
