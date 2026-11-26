import { cn } from "@/lib/utils";
import { markerSides } from "../gantt";
import { DAY_WIDTH, ticksOf, xOfDay, type Zoom } from "./axis";

export const AXIS_HEADER_HEIGHT = 44;
const CHAR_WIDTH = 7; // text-xs, an estimate: tabular digits and capitals run wider than the average
const LABEL_PADDING = 8;

type Props = {
  zoom: Zoom;
  first: number;
  last: number;
  label: number;
  /** x of the today line on the axis. */
  todayX: number;
  /** x of the deadline line, or null when there is none or it falls before the axis. */
  deadlineX: number | null;
};

/** The tick labels, leaving out one that would run into the next (a month or quarter ends a few days after `first`). */
function fittingTicks(zoom: Zoom, first: number, last: number) {
  const ticks = ticksOf(zoom, first, last).map((tick) => ({ ...tick, x: xOfDay(tick.day, first, zoom) }));
  return ticks.filter((tick, index) => {
    const next = ticks[index + 1];
    return next === undefined || tick.x + tick.label.length * CHAR_WIDTH + LABEL_PADDING <= next.x;
  });
}

/** REQ-MILESTONE-UI-036: the axis header: tick labels, and the Today and Deadline chips on a row of their own so that they cover no label. */
export function AxisHeader({ zoom, first, last, label, todayX, deadlineX }: Props) {
  const width = (last - first + 1) * DAY_WIDTH[zoom];
  const sides = markerSides(todayX, deadlineX ?? Number.NEGATIVE_INFINITY, width);
  const chip = (side: "left" | "right") => (side === "right" ? "ml-1" : "right-full mr-1");
  return (
    <div aria-hidden data-testid="axis-header" className="relative flex border-b text-xs text-muted-foreground">
      <div className="sticky left-0 z-10 flex-none bg-card" style={{ width: label }} />
      <div className="relative flex-none overflow-hidden" style={{ width, height: AXIS_HEADER_HEIGHT }}>
        {fittingTicks(zoom, first, last).map((tick) => (
          <span key={tick.day} className="absolute top-1 whitespace-nowrap pl-1 font-medium tabular-nums text-foreground" style={{ left: tick.x }}>
            {tick.label}
          </span>
        ))}
        <span data-chip="today" className="absolute top-6" style={{ left: todayX - sides.todayShift }}>
          <span className={cn("absolute whitespace-nowrap rounded bg-identity px-1 text-xs text-primary-foreground", chip(sides.today))}>Today</span>
        </span>
        {deadlineX !== null && (
          <span data-chip="deadline" className="absolute top-6" style={{ left: deadlineX }}>
            <span className={cn("absolute whitespace-nowrap text-xs font-medium text-foreground", chip(sides.end))}>Deadline</span>
          </span>
        )}
      </div>
    </div>
  );
}
