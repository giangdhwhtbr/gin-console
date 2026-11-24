import { useState } from "react";
import { Link } from "@/app/Link";
import { Button } from "@/components/ui/button";
import { plural } from "@/features/milestones/format";
import { formatDate } from "@/lib/dates";
import { beadPath } from "../format";
import type { Changes, ScopeChange } from "./statusApi";

const INITIAL_LIMIT = 8;
const formatNum = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function ChangeRow({ project, item, today }: { project: string; item: ScopeChange; today: string }) {
  const link = (
    <Link to={beadPath(project, item.id)} className="font-medium hover:text-identity">
      {item.title}
    </Link>
  );
  const day = formatDate(item.day, today);

  if (item.kind === "bug_added") {
    return (
      <li className="flex min-w-0 flex-col gap-0.5 text-sm">
        <span className="min-w-0 break-words">Bug: {link}</span>
        <span className="text-xs text-muted-foreground">
          Added {day}
          {item.epic !== null && (
            <>
              {" under "}
              <Link to={beadPath(project, item.epic.id)} className="hover:text-identity">
                {item.epic.title}
              </Link>
            </>
          )}
          {item.person !== null && `, ${item.person}`}
        </span>
      </li>
    );
  }

  let headline;
  switch (item.kind) {
    case "epic_added":
      headline = item.points !== null ? <>{link} added with {plural(item.points, "point")}</> : <>{link} added, not estimated</>;
      break;
    case "epic_removed":
      headline = item.points !== null ? <>{link} moved out with {plural(item.points, "point")}</> : <>{link} moved out</>;
      break;
    case "estimated":
      headline = <>{link} estimated at {plural(item.to ?? 0, "point")}</>;
      break;
    case "re_estimated":
      headline = <>{link} re-estimated from {item.from} to {plural(item.to ?? 0, "point")}</>;
      break;
  }

  return (
    <li className="flex min-w-0 flex-col gap-0.5 text-sm">
      <span className="min-w-0 break-words">{headline}</span>
      <span className="text-xs text-muted-foreground">{day}</span>
    </li>
  );
}

/** REQ-REPORTS-030: scope changes since kickoff, capped to 8 rows with a "Show all <n>" toggle. */
export function ChangesPanel({ project, changes, today }: { project: string; changes: Changes; today: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? changes.items : changes.items.slice(0, INITIAL_LIMIT);

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">Changed since kickoff</h3>
        {changes.scope_from !== null && changes.scope_to !== null && (
          <p className="text-xs text-muted-foreground">
            Scope {formatNum(changes.scope_from)} → {formatNum(changes.scope_to)} points
          </p>
        )}
      </div>
      {changes.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes since kickoff</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {visible.map((item) => (
              <ChangeRow key={`${item.day}-${item.kind}-${item.id}`} project={project} item={item} today={today} />
            ))}
          </ul>
          {!expanded && changes.items.length > INITIAL_LIMIT && (
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setExpanded(true)}>
              Show all {changes.items.length}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
