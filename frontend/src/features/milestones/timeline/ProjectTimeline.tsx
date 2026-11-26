import { useEffectEvent, useLayoutEffect, useRef, type ReactNode } from "react";
import { Link } from "@/app/Link";
import { StateGlyph } from "@/components/StateGlyph";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { beadPath } from "@/features/reports/format";
import { milestonePath, type MilestoneList } from "../api";
import { dayOf, isWeekend } from "../gantt";
import { MilestoneStatus } from "../MilestoneStatus";
import { usePan } from "../usePan";
import { useLabelWidth } from "../useLabelWidth";
import { AXIS_HEADER_HEIGHT, AxisHeader } from "./AxisHeader";
import { DAY_WIDTH, spanOf, ticksOf, timelineGroups, xOfDay, type Bar, type EpicRow, type Group, type Zoom } from "./axis";

const ZOOMS: { value: Zoom; label: string }[] = [
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "quarters", label: "Quarters" },
];
/** Room kept between the label column and today when the Timeline opens. */
const TODAY_MARGIN = 40;
const BAR_HEIGHT = 14;

// the state fills of the milestone Gantt (`LOOK` in GanttChart.tsx, not exported), by epic status
const FILL = {
  open: "border-[1.5px] border-state-ready bg-card",
  in_progress: "bg-state-progress",
  blocked: "bg-state-blocked",
  closed: "bg-state-done",
  deferred: "border-[1.5px] border-dashed border-state-deferred bg-card",
} as const;
const isFill = (status: string): status is keyof typeof FILL => Object.hasOwn(FILL, status);
const fillOf = (status: string) => (isFill(status) ? FILL[status] : FILL.open);

type Props = {
  project: string;
  list: MilestoneList;
  zoom: Zoom;
  showClosed: boolean;
  onZoom: (zoom: Zoom) => void;
  onShowClosed: (on: boolean) => void;
};

/** REQ-MILESTONE-UI-035 to 038: the milestones and epics of a project as bars on a calendar axis. */
export function ProjectTimeline({ project, list, zoom, showClosed, onZoom, onShowClosed }: Props) {
  const groups = timelineGroups(list, showClosed);
  return (
    <section aria-label="Timeline" className="flex min-w-0 flex-col rounded border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div role="group" aria-label="Zoom" className="flex gap-1">
          {ZOOMS.map((z) => (
            <Button key={z.value} variant={zoom === z.value ? "secondary" : "ghost"} size="sm" aria-pressed={zoom === z.value} onClick={() => onZoom(z.value)}>
              {z.label}
            </Button>
          ))}
        </div>
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showClosed} onChange={(event) => onShowClosed(event.target.checked)} className="rounded border" />
          <span>Show closed</span>
        </label>
      </div>
      {list.forecast === null && <p className="px-3 py-2 text-sm text-muted-foreground">No open work to forecast</p>}
      {showClosed && list.closed_epics === null && (
        <p className="px-3 py-2 text-sm text-muted-foreground">Closed epics unavailable: Beads could not be read</p>
      )}
      {groups.length > 0 && <Chart project={project} list={list} groups={groups} zoom={zoom} showClosed={showClosed} />}
    </section>
  );
}

function Chart({ project, list, groups, zoom, showClosed }: { project: string; list: MilestoneList; groups: Group[]; zoom: Zoom; showClosed: boolean }) {
  const label = useLabelWidth();
  const scroller = useRef<HTMLDivElement>(null);
  usePan(scroller);
  const { first, last } = spanOf(groups, list.forecast, list.today);
  const dayWidth = DAY_WIDTH[zoom];
  const width = (last - first + 1) * dayWidth;
  const todayX = xOfDay(dayOf(list.today), first, zoom);
  const deadline = list.forecast?.deadline ?? null;
  const deadlineX = deadline === null ? null : xOfDay(dayOf(deadline), first, zoom);
  // a deadline before the first day of the axis has no place on it, so no line is drawn (never clamped)
  const shownDeadlineX = deadlineX !== null && deadlineX >= 0 ? deadlineX : null;

  const scrollToToday = useEffectEvent(() => {
    if (scroller.current !== null) scroller.current.scrollLeft = Math.max(0, todayX - TODAY_MARGIN);
  });
  // REQ-MILESTONE-UI-036: today near the left edge when the Timeline opens, the zoom changes, or closed history moves the axis
  useLayoutEffect(() => scrollToToday(), [zoom, showClosed]);

  const days = Array.from({ length: last - first + 1 }, (_, n) => first + n);
  return (
    <div ref={scroller} data-scroller className="overflow-x-auto">
      <div className="relative" style={{ width: label + width }}>
        <AxisHeader zoom={zoom} first={first} last={last} label={label} todayX={todayX} deadlineX={shownDeadlineX} />
        <Backdrop zoom={zoom} first={first} last={last} label={label} width={width} days={days} />
        <ul className="relative flex flex-col">
          {groups.map((group) => (
            <li key={group.kind === "milestone" ? group.id : "none"} className="border-b last:border-b-0">
              <GroupRows project={project} group={group} first={first} zoom={zoom} label={label} width={width} today={list.today} />
            </li>
          ))}
        </ul>
        <div aria-hidden className="pointer-events-none absolute bottom-0 z-[5]" style={{ left: label, width, top: AXIS_HEADER_HEIGHT }}>
          <div data-line="today" className="absolute inset-y-0 border-l border-identity" style={{ left: todayX }} />
          {shownDeadlineX !== null && <div data-line="deadline" className="absolute inset-y-0 border-l-2 border-foreground" style={{ left: shownDeadlineX }} />}
        </div>
      </div>
    </div>
  );
}

/** The shading of weekends (Weeks only) and a faint line at each tick, under the bars. */
function Backdrop({ zoom, first, last, label, width, days }: { zoom: Zoom; first: number; last: number; label: number; width: number; days: number[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-0" style={{ left: label, width, top: AXIS_HEADER_HEIGHT }}>
      {zoom === "weeks" &&
        days
          .filter(isWeekend)
          .map((day) => <div key={day} data-weekend className="absolute inset-y-0 bg-muted/60" style={{ left: xOfDay(day, first, zoom), width: DAY_WIDTH[zoom] }} />)}
      {ticksOf(zoom, first, last).map((tick) => (
        <div key={tick.day} className="absolute inset-y-0 border-l border-border/60" style={{ left: xOfDay(tick.day, first, zoom) }} />
      ))}
    </div>
  );
}

type RowProps = { project: string; first: number; zoom: Zoom; label: number; width: number; today: string };

function GroupRows({ project, group, ...axis }: RowProps & { group: Group }) {
  return (
    <>
      {group.kind === "milestone" ? (
        <MilestoneRow project={project} group={group} {...axis} />
      ) : (
        <Line label={axis.label} width={axis.width} heading>
          <span className="font-medium">Not in a milestone</span>
        </Line>
      )}
      {group.epics.length > 0 && (
        <ul>
          {group.epics.map((epic) => (
            <li key={epic.id}>
              <EpicLine project={project} epic={epic} {...axis} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** One row: the label column stays at the left while the track scrolls under it. */
function Line({ label, width, heading = false, children, track }: { label: number; width: number; heading?: boolean; children: ReactNode; track?: ReactNode }) {
  return (
    <div className="flex">
      <div className={cn("sticky left-0 z-10 flex min-w-0 flex-none flex-col justify-center gap-0.5 border-r bg-card px-3 py-1.5 text-sm", heading && "bg-muted/40")} style={{ width: label }}>
        {children}
      </div>
      <div aria-hidden className="relative z-[1] flex-none self-stretch" style={{ width }}>
        {track}
      </div>
    </div>
  );
}

const centered = { top: "50%", height: BAR_HEIGHT, marginTop: -BAR_HEIGHT / 2 } as const;
const blockOf = (bar: Bar, first: number, zoom: Zoom) => ({
  left: xOfDay(dayOf(bar.from), first, zoom),
  width: Math.max(2, (dayOf(bar.to) - dayOf(bar.from) + 1) * DAY_WIDTH[zoom]),
  ...centered,
});

function MilestoneRow({ project, group, first, zoom, label, width, today }: RowProps & { group: Extract<Group, { kind: "milestone" }> }) {
  const closed = group.status === "closed";
  return (
    <Line
      label={label}
      width={width}
      heading
      track={
        <>
          {group.window !== null && (
            <div data-bar="milestone" className={cn("absolute rounded-sm", closed ? "bg-state-done/50" : "bg-identity/40")} style={blockOf(group.window, first, zoom)} />
          )}
          {group.overrun !== null && (
            <div
              data-overrun
              title="Past the milestone's end: the forecast finish"
              className="absolute rounded-sm"
              style={{ ...blockOf(group.overrun, first, zoom), backgroundImage: "repeating-linear-gradient(45deg, var(--state-blocked) 0 2px, transparent 2px 6px)" }}
            />
          )}
        </>
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        <span title={group.title} className="min-w-0 truncate font-medium">
          <Link to={milestonePath(project, group.id)} className="hover:text-identity">
            {group.title}
          </Link>
        </span>
        <MilestoneStatus status={group.status} className="shrink-0" />
      </span>
      {group.noOpenEpics && <span className="text-xs text-muted-foreground">No open epics</span>}
      {group.finish !== null && <span className="text-xs text-muted-foreground">{`${closed ? "Finished" : "Finishes"} ${formatDate(group.finish, today)}`}</span>}
    </Line>
  );
}

function EpicLine({ project, epic, first, zoom, label, width }: RowProps & { epic: EpicRow }) {
  return (
    <Line
      label={label}
      width={width}
      track={
        <div
          aria-label={epic.label}
          data-assumed={epic.assumed ? "" : undefined}
          className={cn("absolute rounded-full", fillOf(epic.status), epic.assumed && "border-[1.5px] border-dashed border-foreground")}
          style={blockOf(epic.bar, first, zoom)}
        />
      }
    >
      <span title={epic.title} className="min-w-0 truncate pl-4 font-medium">
        <Link to={beadPath(project, epic.id)} className="hover:text-identity">
          {epic.title}
        </Link>
      </span>
      <span className="flex items-center gap-2 pl-4 text-xs text-muted-foreground">
        {epic.lane !== null && <span>{`Lane ${epic.lane}`}</span>}
        {epic.remaining !== null && <span>{`${epic.remaining} d left`}</span>}
        {epic.warned && (
          <>
            <StateGlyph state="deferred" color="var(--state-blocked)" size={10} />
            <span className="sr-only">Has warnings</span>
          </>
        )}
      </span>
    </Line>
  );
}
