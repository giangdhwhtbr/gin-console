import { TriangleAlert } from "lucide-react";
import { useCallback } from "react";
import { Link } from "@/app/Link";
import { fetchMilestones, milestonePath } from "@/features/milestones/api";
import { plural } from "@/features/milestones/format";
import { formatDate, formatRange } from "@/lib/dates";
import { useLoad } from "@/features/milestones/useLoad";
import { cn } from "@/lib/utils";
import type { BeadDetail } from "./api";
import { workingDaysLeft } from "./epicOverview";
import { Fact, Facts, OverviewCard } from "./OverviewCard";

const STATUS: Record<string, string> = { active: "Active", scheduled: "Scheduled", planned: "Planned", closed: "Closed" };

function Details({ project, id }: { project: string; id: string }) {
  const fetcher = useCallback(() => fetchMilestones(project), [project]);
  const { state, retry } = useLoad(fetcher, false);
  if (state.status === "loading") return <p className="text-muted-foreground">Loading milestone…</p>;
  if (state.status === "error") {
    return (
      <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
        <span>Milestones unavailable</span>
        <button type="button" className="underline" onClick={retry}>
          Retry
        </button>
      </p>
    );
  }
  const { today } = state.data;
  const entry = state.data.milestones.find((m) => m.id === id);
  const link = (
    <Link to={milestonePath(project, id)} className="min-w-0 text-lg font-bold wrap-anywhere underline-offset-2 hover:underline">
      {entry === undefined ? id : `${id} ${entry.title}`}
    </Link>
  );
  if (entry === undefined) return link;
  const { start, end, finish } = entry;
  const late = end !== null && finish !== null && finish > end;
  const window = start !== null && end !== null ? formatRange(start, end, today) : null;
  const left = entry.status === "active" && end !== null ? workingDaysLeft(today, end) : null;
  return (
    <>
      {link}
      <Facts>
        <Fact label="Status">{STATUS[entry.status] ?? entry.status}</Fact>
        {window !== null && <Fact label="Window">{window}</Fact>}
        {left !== null && <Fact label="Ends in">{plural(left, "working day")}</Fact>}
        {finish !== null && (
          <Fact label="Forecast">
            <span className={cn("inline-flex items-baseline gap-1", late && "text-state-blocked")}>
              {late && <TriangleAlert aria-hidden className="size-3.5 shrink-0 self-center" />}
              <span>{late ? `finish ${formatDate(finish, today)}, after the end` : `finish ${formatDate(finish, today)}`}</span>
            </span>
          </Fact>
        )}
      </Facts>
    </>
  );
}

/** REQ-UI-120: the milestone of the epic with its window, working days left and forecast; its own loading and error. */
export function MilestoneCard({ project, bead }: { project: string; bead: BeadDetail }) {
  return (
    <OverviewCard title="Milestone">
      {bead.milestone === null ? <p className="text-muted-foreground">No milestone</p> : <Details project={project} id={bead.milestone} />}
    </OverviewCard>
  );
}
