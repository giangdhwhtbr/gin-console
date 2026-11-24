import { Fragment } from "react";
import { Link } from "@/app/Link";
import { StateGlyph } from "@/components/StateGlyph";
import type { MilestoneDetail } from "@/features/milestones/api";
import { beadPath } from "../format";
import type { Risks } from "./statusApi";
import { riskItems } from "./statusView";

const PREVIEW_LIMIT = 3;

function LinkedList({ project, items }: { project: string; items: readonly { id: string; title: string }[] }) {
  const shown = items.slice(0, PREVIEW_LIMIT);
  const rest = items.length - shown.length;
  return (
    <span className="text-xs text-muted-foreground">
      {shown.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 && ", "}
          <Link to={beadPath(project, item.id)} className="hover:text-identity">
            {item.title}
          </Link>
        </Fragment>
      ))}
      {rest > 0 && `, ${rest} more`}
    </span>
  );
}

/** REQ-REPORTS-030: blocked beads, unestimated epics and unconfirmed specs that could move the finish date. */
export function RisksPanel({ project, risks, detail }: { project: string; risks: Risks; detail: MilestoneDetail | null }) {
  const items = riskItems(risks, detail);

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">Risks</h3>
        <p className="text-xs text-muted-foreground">What could move the finish date</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No risks found</p>
      ) : (
        <ul className="flex flex-col gap-2.5 text-sm">
          {items.map((item) => {
            switch (item.kind) {
              case "blocked": {
                const { row } = item;
                return (
                  <li key={`blocked-${row.id}`} className="flex min-w-0 items-start gap-2">
                    <StateGlyph state="blocked" size={12} className="mt-0.5 flex-none" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="min-w-0 break-words">
                        <Link to={beadPath(project, row.id)} className="font-medium hover:text-identity">
                          {row.title}
                        </Link>
                        {row.blocker !== null ? (
                          <>
                            {" waits on "}
                            <Link to={beadPath(project, row.blocker.id)} className="font-medium hover:text-identity">
                              {row.blocker.title}
                            </Link>
                          </>
                        ) : (
                          " is blocked"
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.note}</span>
                    </div>
                  </li>
                );
              }
              case "more":
                return (
                  <li key="more" className="text-xs text-muted-foreground">
                    {item.text}
                  </li>
                );
              case "unestimated":
              case "unapproved":
                return (
                  <li key={item.kind} className="flex min-w-0 items-start gap-2">
                    <StateGlyph state="deferred" size={12} color="var(--state-blocked)" className="mt-0.5 flex-none" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span>{item.text}</span>
                      <LinkedList project={project} items={item.items} />
                    </div>
                  </li>
                );
            }
          })}
        </ul>
      )}
    </section>
  );
}
