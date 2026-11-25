import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BeadSummary } from "@/features/beads/api";
import { blockerSummary, waitsOn } from "@/features/beads/blockers";
import { StateMark } from "@/features/beads/StateMark";
import { TypeBadge } from "@/features/beads/TypeBadge";
import { useMinWidth } from "@/features/beads/useWide";
import { formatDate } from "@/lib/dates";
import type { WorkGroup } from "./groups";

type Props = {
  group: WorkGroup;
  project: string;
  known: ReadonlyMap<string, BeadSummary>;
  email: string;
};

/** REQ-UI-100: "Blocked by <title> +n" in Blocked, "Waits on <title>" in Waiting on me. */
function BlockerText({ group, bead, known, email }: { group: WorkGroup; bead: BeadSummary; known: ReadonlyMap<string, BeadSummary>; email: string }) {
  if (group.key === "blocked") {
    const summary = blockerSummary(bead, known);
    if (summary === null) return null;
    return (
      <p className="text-13 text-muted-foreground">
        Blocked by {summary.label}
        {summary.more > 0 && <> +{summary.more}</>}
      </p>
    );
  }
  if (group.key === "waiting") {
    const label = waitsOn(bead, known, email);
    return label === null ? null : <p className="text-13 text-muted-foreground">Waits on {label}</p>;
  }
  return null;
}

/** One group of My work with its heading and count: a table from 768px, a list of cards under it (REQ-UI-153). The two groups of "Next up" sit under that h2, so theirs are h3. */
export function MyWorkGroup({ group, project, known, email }: Props) {
  const wide = useMinWidth(768);
  const href = (bead: BeadSummary) => `/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`;
  const Heading = group.key === "mine" || group.key === "unclaimed" ? "h3" : "h2";
  const blocker = (bead: BeadSummary) => <BlockerText group={group} bead={bead} known={known} email={email} />;
  return (
    <section className="flex flex-col gap-2">
      <Heading className={Heading === "h2" ? "text-base font-semibold" : "text-sm font-medium"}>
        {group.title} <span className="text-sm font-normal text-muted-foreground">{group.beads.length}</span>
      </Heading>
      {group.beads.length === 0 ? (
        <p className="text-muted-foreground">Nothing here</p>
      ) : !wide ? (
        <ul className="flex flex-col gap-2">
          {group.beads.map((bead) => (
            <li key={bead.id} data-id={bead.id} className="flex flex-col gap-1 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-13 text-muted-foreground">{bead.id}</span>
                <span className="text-13">P{bead.priority}</span>
              </div>
              <Link to={href(bead)} className="break-words">
                {bead.title}
              </Link>
              <div>
                <StateMark bead={bead} />
              </div>
              {blocker(bead)}
            </li>
          ))}
        </ul>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.beads.map((bead) => (
              <TableRow key={bead.id} data-id={bead.id} tabIndex={-1}>
                <TableCell className="whitespace-normal">
                  <Link to={href(bead)}>
                    <span className="font-mono text-13 text-muted-foreground">{bead.id}</span> {bead.title}
                  </Link>
                  {blocker(bead)}
                </TableCell>
                <TableCell>
                  <StateMark bead={bead} />
                </TableCell>
                <TableCell>
                  <TypeBadge type={bead.issue_type} />
                </TableCell>
                <TableCell>P{bead.priority}</TableCell>
                <TableCell>{formatDate(bead.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
