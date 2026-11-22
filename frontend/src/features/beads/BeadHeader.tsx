import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FactList, type Fact } from "@/components/FactList";
import { PriorityPill } from "@/components/PriorityPill";
import { SizeBadge } from "@/components/SizeBadge";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { BeadDetail } from "./api";
import { personOf } from "@/lib/people";
import { AssigneeName } from "./AssigneeName";
import { complexityOf } from "./complexity";
import { graphViewPath } from "./graph";
import { KindBadge } from "./KindBadge";
import { LaneChip } from "./LaneChip";
import { leaseOf, trackText, visibleLabels } from "./laneFacts";
import { gateState, gateWords } from "./mergeGates";
import { StateMark } from "./StateMark";
import { TypeBadge } from "./TypeBadge";

/** The title, badges and facts of a bead (REQ-UI-028, REQ-UI-110), shared by the bead page and the epic page. */
export function BeadHeader({ project, bead }: { project: string; bead: BeadDetail }) {
  const complexity = bead.issue_type === "epic" ? complexityOf(bead.description) : null;
  const gate = bead.waits_for;
  const lease = leaseOf([bead.claim], new Date());
  const facts: Fact[] = [
    { label: "Lane", value: bead.lane },
    { label: "Track", value: bead.track === null ? null : trackText(bead.track) },
    { label: "Lease", value: lease?.text ?? null },
    { label: "Placeholder", value: gate === null ? null : bead.title },
    { label: "Waits for", value: gate === null ? null : `${gate.plan} #${gate.number}` },
    { label: "Assignee", value: <AssigneeName assignee={bead.assignee} />, title: bead.assignee ?? undefined },
    { label: "Created by", value: personOf(bead.created_by) ?? personOf(bead.owner) },
    { label: "Created", value: formatDateTime(bead.created_at) },
    { label: "Updated", value: formatDateTime(bead.updated_at) },
    { label: "Comments", value: bead.comment_count },
  ].filter((fact) => fact.value !== null && fact.value !== "");

  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold wrap-anywhere">{gate === null ? bead.title : `Waits for ${gateWords(gate)} to merge`}</h1>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono wrap-anywhere">{bead.id}</span>
        {gate === null ? <StateMark bead={bead} /> : <Badge variant="secondary">{gateState(bead.status)}</Badge>}
        {bead.lane !== null && <LaneChip lane={bead.lane} />}
        <PriorityPill priority={bead.priority} />
        <SizeBadge points={bead.points} estimateMinutes={bead.estimate_minutes} />
        <TypeBadge type={bead.issue_type} />
        <KindBadge kind={bead.kind} />
        {complexity !== null && (
          <Badge variant="outline" className={cn(complexity === "high" ? "text-state-blocked" : "text-muted-foreground")}>
            {`Complexity: ${complexity}`}
          </Badge>
        )}
        {visibleLabels(bead).map((label) => (
          <Badge key={label} variant="outline">
            {label}
          </Badge>
        ))}
      </div>
      {bead.capabilities.length > 0 && (
        <ul aria-label="Capabilities" className="flex flex-wrap items-center gap-2 text-sm">
          {bead.capabilities.map((cap) => (
            <li key={cap}>
              <Badge variant="outline">{cap}</Badge>
            </li>
          ))}
        </ul>
      )}
      {bead.points_reason !== null && bead.points_reason.trim() !== "" && (
        <p className="text-sm text-muted-foreground wrap-anywhere">{bead.points_reason}</p>
      )}
      <FactList facts={facts} />
      {bead.issue_type !== "epic" &&
        (bead.children.length > 0 ||
          [...bead.dependencies, ...bead.dependents].some((r) => r.type === "blocks")) && (
        <Link
          to={graphViewPath(project, { id: bead.id, parent: bead.milestone === bead.parent ? null : bead.parent }, bead.children.length > 0)}
          className={cn(buttonVariants({ size: "sm" }), "self-start")}
        >
          View in graph
        </Link>
      )}
    </header>
  );
}
