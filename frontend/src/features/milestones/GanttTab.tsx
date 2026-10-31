import { Button } from "@/components/ui/button";
import type { MilestoneDetail } from "./api";
import { CopyCommand } from "./CopyCommand";
import { shortDate, weekday } from "./format";
import { GanttChart } from "./GanttChart";
import { MilestoneError } from "./MilestoneError";
import type { LoadState } from "./useLoad";

/** REQ-MILESTONE-UI-003 and -004: the current plan, or a read-only preview from a picked kick-start date. */
export function GanttTab({
  project,
  plan,
  start,
  preview,
  onRetryPreview,
  onStart,
}: {
  project: string;
  plan: MilestoneDetail;
  start: string | null;
  preview: LoadState<MilestoneDetail | null>;
  onRetryPreview: () => void;
  onStart: (date: string | null) => void;
}) {
  const pickable = plan.status === "planned" || plan.status === "scheduled";
  const previewing = pickable && start !== null;
  const failed = previewing && preview.status === "error";
  // a preview never draws the current plan or an earlier preview: only a fresh answer for this date
  const fresh = preview.status === "ok" && !preview.stale ? preview.data : null;
  const shown = previewing ? fresh : plan;
  return (
    <div className="flex flex-col gap-3">
      {pickable && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            Kick-start date
            <input
              type="date"
              value={start ?? plan.kickoff ?? plan.start}
              onChange={(event) => onStart(event.target.value === "" ? null : event.target.value)}
              className="rounded border bg-background px-2 py-1"
            />
          </label>
          {start !== null && (
            <Button variant="outline" size="sm" onClick={() => onStart(null)}>
              Reset
            </Button>
          )}
        </div>
      )}
      {previewing && !failed && (
        <div className="flex flex-col gap-2 rounded border border-dashed p-3 text-sm md:flex-row md:items-center md:justify-between">
          <p>{`Preview from ${weekday(start)} ${shortDate(start, plan.today)}. Nothing changes until you run:`}</p>
          <CopyCommand command={`gin-workflow milestone kickstart ${plan.id} --date ${start}`} />
        </div>
      )}
      {failed ? (
        <MilestoneError error={preview.error} onRetry={onRetryPreview} />
      ) : shown === null ? (
        <p aria-busy className="text-muted-foreground">
          Loading preview…
        </p>
      ) : (
        <GanttChart project={project} plan={shown} preview={previewing} />
      )}
    </div>
  );
}
