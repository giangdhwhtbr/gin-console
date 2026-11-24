import { Fragment } from "react";
import { Link } from "@/app/Link";
import { StateGlyph } from "@/components/StateGlyph";
import type { MilestoneDetail } from "@/features/milestones/api";
import { plural } from "@/features/milestones/format";
import { beadPath } from "../format";
import type { Risks } from "./statusApi";

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
  const openEpics = detail?.epics.filter((e) => e.status !== "closed") ?? [];
  const unconfirmed = openEpics.filter((e) => e.spec_confirmed === false);
  const empty = risks.blocked.length === 0 && risks.blocked_more === 0 && risks.unestimated.length === 0 && unconfirmed.length === 0;

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">Risks</h3>
        <p className="text-xs text-muted-foreground">What could move the finish date</p>
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground">No risks found</p>
      ) : (
        <ul className="flex flex-col gap-2.5 text-sm">
          {risks.blocked.map((row) => (
            <li key={row.id} className="flex min-w-0 items-start gap-2">
              <StateGlyph state="blocked" size={12} className="mt-0.5 flex-none" />
              <div className="flex min-w-0 flex-col gap-0.5">
                {row.blocker !== null ? (
                  <>
                    <span className="min-w-0 break-words">
                      <Link to={beadPath(project, row.id)} className="font-medium hover:text-identity">
                        {row.title}
                      </Link>
                      {" waits on "}
                      <Link to={beadPath(project, row.blocker.id)} className="font-medium hover:text-identity">
                        {row.blocker.title}
                      </Link>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.blocker.blocked ? `${row.blocker.title} is blocked too, ` : ""}
                      {row.blocker.person}, {plural(row.days, "day")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 break-words">
                      <Link to={beadPath(project, row.id)} className="font-medium hover:text-identity">
                        {row.title}
                      </Link>
                      {" is blocked"}
                    </span>
                    <span className="text-xs text-muted-foreground">{plural(row.days, "day")}</span>
                  </>
                )}
              </div>
            </li>
          ))}
          {risks.blocked_more > 0 && (
            <li className="text-xs text-muted-foreground">
              {risks.blocked_more} more blocked {risks.blocked_more === 1 ? "bead" : "beads"}
            </li>
          )}
          {risks.unestimated.length > 0 && (
            <li className="flex min-w-0 items-start gap-2">
              <StateGlyph state="deferred" size={12} color="var(--state-blocked)" className="mt-0.5 flex-none" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span>
                  {risks.unestimated.length} {risks.unestimated.length === 1 ? "epic has" : "epics have"} no estimate
                </span>
                <LinkedList project={project} items={risks.unestimated} />
              </div>
            </li>
          )}
          {unconfirmed.length > 0 && (
            <li className="flex min-w-0 items-start gap-2">
              <StateGlyph state="deferred" size={12} color="var(--state-blocked)" className="mt-0.5 flex-none" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span>
                  {unconfirmed.length} of {openEpics.length} epics: spec not approved yet
                </span>
                <LinkedList project={project} items={unconfirmed} />
              </div>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
