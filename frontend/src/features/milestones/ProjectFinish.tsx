import { StateGlyph } from "@/components/StateGlyph";
import { formatDate } from "@/lib/dates";
import type { Forecast } from "./api";
import { plural } from "./format";

/** REQ-MILESTONE-UI-034: the project finish under the page title, in both views. */
export function ProjectFinish({ forecast, today }: { forecast: Forecast | null; today: string }) {
  if (forecast === null) return null;
  if (forecast.error !== null) return <p className="text-sm text-destructive">{`Forecast unavailable: ${forecast.error}`}</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm">
      <span className="font-medium">{forecast.finish === null ? "Project finish not estimated" : `Project finishes ${formatDate(forecast.finish, today)}`}</span>
      {forecast.deadline !== null && <span className="text-muted-foreground">{`deadline ${formatDate(forecast.deadline, today)}`}</span>}
      {forecast.overflow_days > 0 && (
        <span className="inline-flex items-center gap-1 text-state-blocked">
          <StateGlyph state="deferred" color="var(--state-blocked)" size={10} />
          {`${plural(forecast.overflow_days, "working day")} late`}
        </span>
      )}
    </p>
  );
}
