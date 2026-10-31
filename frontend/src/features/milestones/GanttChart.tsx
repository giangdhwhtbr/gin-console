import { Ban, Check, Circle, CircleDot, Clock, TriangleAlert } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Link } from "@/app/Link";
import { useWide } from "@/features/beads/useWide";
import { cn } from "@/lib/utils";
import type { EpicPlan, MilestoneDetail } from "./api";
import { CopyCommand } from "./CopyCommand";
import { shortDate } from "./format";
import { axisOf, beadsOf, dayOf, endOf, isoOf, middleOf, monthsOf, periodOf, sortEpics, warningLines, xOf, type Axis } from "./gantt";

const LOOK = {
  open: { icon: Circle, label: "Open", text: "text-muted-foreground", fill: "border border-muted-foreground bg-card" },
  in_progress: { icon: CircleDot, label: "In progress", text: "text-state-progress", fill: "bg-state-progress" },
  blocked: { icon: Ban, label: "Blocked", text: "text-state-blocked", fill: "bg-state-blocked" },
  closed: { icon: Check, label: "Closed", text: "text-state-done", fill: "bg-state-done opacity-60" },
  deferred: {
    icon: Clock,
    label: "Deferred",
    text: "text-state-deferred",
    fill: "border border-state-deferred bg-[repeating-linear-gradient(135deg,var(--state-deferred)_0_2px,transparent_2px_5px)]",
  },
} as const;
const isLook = (status: string): status is keyof typeof LOOK => Object.hasOwn(LOOK, status);
const lookOf = (status: string) => (isLook(status) ? LOOK[status] : LOOK.open);
const enc = encodeURIComponent;

/** REQ-MILESTONE-UI-003: each epic as beads on a thread, one bead per working day; weekends narrow. */
export function GanttChart({ project, plan, preview }: { project: string; plan: MilestoneDetail; preview: boolean }) {
  const wide = useWide();
  const label = wide ? 256 : 160;
  const axis = axisOf(plan, wide ? 28 : 20);
  const scroller = useRef<HTMLDivElement>(null);
  const todayX = middleOf(axis, dayOf(plan.today));
  const endX = endOf(axis, dayOf(plan.end));

  // opens at today when today is in range; a refresh or a preview keeps the user's scroll
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el !== null && todayX !== null) el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);

  if (plan.epics.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p>No epics in this milestone. Add some with:</p>
        <CopyCommand command={`/roadmap --milestone ${plan.id}`} />
      </div>
    );
  }
  return (
    <figure aria-label="Schedule" className={cn("flex flex-col gap-2 rounded border bg-card", preview && "border-dashed")}>
      <div ref={scroller} className="isolate overflow-x-auto">
        <div className="relative" style={{ width: label + axis.width }}>
          <div aria-hidden className="absolute inset-y-0" style={{ left: label }}>
            {axis.columns
              .filter((c) => c.weekend)
              .map((c) => (
                <span key={c.day} className="absolute inset-y-0 bg-muted" style={{ left: c.x, width: c.width }} />
              ))}
            <span className="absolute inset-y-0 bg-state-blocked/5" style={{ left: endX, width: Math.max(0, axis.width - endX) }} />
          </div>
          <Header axis={axis} label={label} today={plan.today} />
          <ol aria-label="Epics" className="relative">
            {sortEpics(plan.epics).map((epic) => (
              <EpicRow key={epic.id} project={project} epic={epic} axis={axis} label={label} today={plan.today} />
            ))}
          </ol>
          {todayX !== null && (
            <div data-line="today" aria-hidden className="absolute inset-y-0 z-[5] border-l border-dashed border-foreground" style={{ left: label + todayX }}>
              <span className="absolute top-0 ml-1 rounded bg-foreground px-1 text-[11px] text-background">Today</span>
            </div>
          )}
          <div data-line="end" aria-hidden className="absolute inset-y-0 z-[5] border-l-2 border-foreground" style={{ left: label + endX }}>
            <span className="absolute top-5 ml-1 whitespace-nowrap text-[11px] font-medium">{`End ${shortDate(plan.end, plan.today)}`}</span>
          </div>
        </div>
      </div>
      <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-xs text-muted-foreground">
        {Object.values(LOOK).map((look) => (
          <li key={look.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-3 w-5 rounded-full", look.fill)} />
            {look.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 border-l border-dashed border-foreground" />
          Today
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 border-l-2 border-foreground" />
          End
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-5 bg-state-blocked/10" />
          Past the end
        </li>
      </ul>
    </figure>
  );
}

function Header({ axis, label, today }: { axis: Axis; label: number; today: string }) {
  return (
    <div aria-hidden className="relative flex border-b text-[11px] text-muted-foreground">
      <div className="sticky left-0 z-10 flex-none bg-card" style={{ width: label }} />
      <div className="relative h-10 flex-none" style={{ width: axis.width }}>
        {monthsOf(axis, today).map((m) => (
          <span key={m.key} className="absolute top-1 truncate pl-1 font-medium text-foreground" style={{ left: m.x, width: m.width }}>
            {m.label}
          </span>
        ))}
        {axis.columns
          .filter((c) => !c.weekend)
          .map((c) => (
            <span key={c.day} className="absolute bottom-1 text-center tabular-nums" style={{ left: c.x, width: c.width }}>
              {Number(c.iso.slice(8))}
            </span>
          ))}
      </div>
    </div>
  );
}

function EpicRow({ project, epic, axis, label, today }: { project: string; epic: EpicPlan; axis: Axis; label: number; today: string }) {
  const look = lookOf(epic.status);
  const Icon = look.icon;
  const days = beadsOf(epic);
  const x0 = xOf(axis, days[0]);
  const x1 = endOf(axis, days[days.length - 1]);
  const unestimated = epic.estimate_days === null;
  return (
    <li data-epic={epic.id} className="flex border-b last:border-b-0">
      <div className="sticky left-0 z-10 flex flex-none flex-col gap-0.5 bg-card px-3 py-1.5 text-sm" style={{ width: label }}>
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon role="img" aria-label={look.label} className={cn("size-3.5 flex-none", look.text)} />
          <Link to={`/beads/${enc(project)}/${enc(epic.id)}`} className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline">
            {epic.id}
          </Link>
          <span title={epic.title} className="min-w-0 truncate font-medium">
            {epic.title}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {`${periodOf(epic.planned_start, epic.planned_end, today)}, ${unestimated ? "no estimate" : `${epic.estimate_days}d`}`}
        </span>
        {warningLines(epic, today).map((text) => (
          <span key={text} className="flex items-start gap-1 text-xs text-state-blocked">
            <TriangleAlert aria-hidden className="mt-0.5 size-3 flex-none" />
            {text}
          </span>
        ))}
      </div>
      <div className="relative flex-none" style={{ width: axis.width }}>
        <div
          aria-hidden
          className={cn("absolute top-2 h-4 motion-safe:transition-transform motion-safe:duration-150", look.text)}
          style={{ transform: `translateX(${x0}px)`, width: x1 - x0 }}
        >
          {days.length > 1 && <span className="absolute inset-x-2 top-1/2 h-px bg-current" />}
          {days.map((day) => (
            <span
              key={day}
              data-bead={isoOf(day)}
              className={cn("absolute top-0 h-4 rounded-full", unestimated ? "border border-dashed border-muted-foreground bg-card" : look.fill)}
              style={{ left: xOf(axis, day) - x0 + 2, width: endOf(axis, day) - xOf(axis, day) - 4 }}
            />
          ))}
        </div>
      </div>
    </li>
  );
}
