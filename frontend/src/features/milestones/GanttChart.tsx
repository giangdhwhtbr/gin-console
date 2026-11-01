import { Ban, Check, ChevronLeft, ChevronRight, Circle, CircleDot, Clock, TriangleAlert } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type RefObject, type UIEvent } from "react";
import { Link } from "@/app/Link";
import { Button } from "@/components/ui/button";
import type { BeadSummary } from "@/features/beads/api";
import { useWide } from "@/features/beads/useWide";
import { cn } from "@/lib/utils";
import type { MilestoneDetail } from "./api";
import { CopyCommand } from "./CopyCommand";
import { plural, shortDate, weekday } from "./format";
import {
  axisOf,
  BAR_TOP,
  BEAD_HEIGHT,
  beadsOf,
  boundsOf,
  chainOf,
  dayAt,
  dayOf,
  dependencyArrows,
  endOf,
  fitDayWidth,
  isoOf,
  middleOf,
  mondayOf,
  monthsOf,
  openingDay,
  periodOf,
  rowsOf,
  sortEpics,
  spanOf,
  stepDay,
  warningLines,
  xOf,
  type Axis,
  type Row,
  type Zoom,
} from "./gantt";
import { usePan } from "./usePan";

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

const ZOOMS = [
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "all", label: "Whole milestone" },
] as const;
const DEFAULT_WIDTH = 960; // until the first measure, and in tests, which have no layout
const TAIL_ROOM = 90;

type Props = {
  project: string;
  plan: MilestoneDetail;
  preview: boolean;
  zoom: Zoom;
  onZoom: (zoom: Zoom) => void;
  childBeads: ReadonlyMap<string, readonly BeadSummary[]>;
};

/** REQ-MILESTONE-UI-003 and -011 to -015: each epic as beads on a thread, one bead per working day, zoomed to fit the width. */
export function GanttChart(props: Props) {
  if (props.plan.epics.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p>No epics in this milestone. Add some with:</p>
        <CopyCommand command={`/roadmap --milestone ${props.plan.id}`} />
      </div>
    );
  }
  return <Chart {...props} />;
}

/** The scroller's width, followed with a ResizeObserver where the browser has one. */
function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) setWidth(el.clientWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function Chart({ project, plan, preview, zoom, onZoom, childBeads }: Props) {
  const wide = useWide();
  const label = wide ? 300 : 168;
  const scroller = useRef<HTMLDivElement>(null);
  const plot = useWidth(scroller) - label;
  const span = spanOf(zoom);
  const bounds = boundsOf(plan);
  const dayWidth =
    span === null
      ? fitDayWidth(bounds.first, bounds.last, plot, 14)
      : fitDayWidth(mondayOf(bounds.first), mondayOf(bounds.first) + span - 1, plot, 24);
  const axis = axisOf(plan, dayWidth, zoom);
  const maxLeft = Math.max(0, axis.width - plot);
  const todayX = middleOf(axis, dayOf(plan.today));
  const endX = Math.min(endOf(axis, dayOf(plan.end)), axis.width - 2);
  const [left, setLeft] = useState(0);
  const [hot, setHot] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const opened = useRef<string | null>(null);
  const view = useRef(axis.first); // the first day in view, kept when the day width changes
  usePan(scroller);

  // REQ-MILESTONE-UI-011/-012: open a zoom at its opening day (the whole milestone at today);
  // a refresh keeps the days in view, a resize keeps the first day in view
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el === null) return;
    const key = `${plan.id} ${zoom}`;
    let to = xOf(axis, view.current);
    if (opened.current !== key) {
      opened.current = key;
      to = span !== null ? xOf(axis, openingDay(plan, axis)) : todayX === null ? 0 : todayX - plot / 3;
    }
    to = Math.min(Math.max(0, to), maxLeft);
    el.scrollLeft = to;
    view.current = dayAt(axis, to + 0.5);
    setLeft(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, zoom, dayWidth, axis.first]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const x = event.currentTarget.scrollLeft;
    view.current = dayAt(axis, x + 0.5);
    setLeft(x);
  };
  const step = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el === null || span === null) return;
    const to = Math.min(xOf(axis, stepDay(axis, dayAt(axis, left + 0.5), direction, span)), maxLeft);
    if (typeof el.scrollTo === "function") {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: to, behavior: reduce ? "auto" : "smooth" });
    } else {
      el.scrollLeft = to; // jsdom
    }
    view.current = dayAt(axis, to + 0.5);
    setLeft(to);
  };
  const toggle = (id: string) =>
    setExpanded((before) => {
      const after = new Set(before);
      if (!after.delete(id)) after.add(id);
      return after;
    });

  const epics = sortEpics(plan.epics);
  const rows = rowsOf(epics, plan.today, expanded, childBeads);
  const height = rows.reduce((sum, r) => sum + r.height, 0);
  const chain = hot === null ? null : chainOf(epics, hot);
  const faded = (id: string) => chain !== null && !chain.has(id);
  const date = (day: number) => shortDate(isoOf(day), plan.today);

  return (
    <figure aria-label="Schedule" className={cn("flex flex-col rounded border bg-card", preview && "border-dashed")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div role="group" aria-label="Zoom" className="flex gap-1">
          {ZOOMS.map((z) => (
            <Button key={z.value} variant={zoom === z.value ? "secondary" : "ghost"} size="sm" aria-pressed={zoom === z.value} onClick={() => onZoom(z.value)}>
              {z.label}
            </Button>
          ))}
        </div>
        {span !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Button variant="outline" size="icon-sm" aria-label="Earlier" disabled={left <= 0.5} onClick={() => step(-1)}>
              <ChevronLeft aria-hidden />
            </Button>
            <span data-range className="min-w-32 text-center tabular-nums">
              {`${date(dayAt(axis, left + 0.5))} – ${date(dayAt(axis, left + plot - 0.5))}`}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="Later" disabled={left >= maxLeft - 0.5} onClick={() => step(1)}>
              <ChevronRight aria-hidden />
            </Button>
          </div>
        )}
      </div>
      <div
        ref={scroller}
        data-scroller
        onScroll={onScroll}
        className="isolate overflow-x-auto data-[panning]:cursor-grabbing data-[panning]:select-none"
      >
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
          <div className="relative">
            <Arrows rows={rows} axis={axis} label={label} height={height} chain={chain} />
            <ol aria-label="Epics" onMouseLeave={() => setHot(null)} onBlur={() => setHot(null)}>
              {rows.map((row) =>
                row.kind === "epic" ? (
                  <EpicRow
                    key={row.epic.id}
                    project={project}
                    row={row}
                    axis={axis}
                    label={label}
                    today={plan.today}
                    kids={childBeads.get(row.epic.id) ?? []}
                    open={expanded.has(row.epic.id)}
                    faded={faded(row.epic.id)}
                    onToggle={() => toggle(row.epic.id)}
                    onHot={() => setHot(row.epic.id)}
                  />
                ) : (
                  <ChildRow key={row.bead.id} project={project} row={row} axis={axis} label={label} today={plan.today} faded={faded(row.epic.id)} />
                ),
              )}
            </ol>
          </div>
          {todayX !== null && (
            <div data-line="today" aria-hidden className="absolute inset-y-0 z-[5] border-l border-dashed border-foreground" style={{ left: label + todayX }}>
              <span className="absolute top-0 ml-1 rounded bg-foreground px-1 text-[11px] text-background">Today</span>
            </div>
          )}
          <div data-line="end" aria-hidden className="absolute inset-y-0 z-[5] border-l-2 border-foreground" style={{ left: label + endX }}>
            <span
              className={cn("absolute top-1 whitespace-nowrap text-[11px] font-medium", endX > axis.width - 80 ? "right-full mr-1" : "ml-1")}
            >{`End ${shortDate(plan.end, plan.today)}`}</span>
          </div>
        </div>
      </div>
      <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
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
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-5 bg-muted-foreground" />
          Depends on
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-5 bg-state-blocked" />
          Starts before its dependency ends
        </li>
      </ul>
    </figure>
  );
}

function Header({ axis, label, today }: { axis: Axis; label: number; today: string }) {
  return (
    <div aria-hidden className="relative flex border-b text-[11px] text-muted-foreground">
      <div className="sticky left-0 z-10 flex-none bg-card" style={{ width: label }} />
      <div className="relative h-11 flex-none" style={{ width: axis.width }}>
        {monthsOf(axis, today).map((m) => (
          <span key={m.key} className="absolute top-1 truncate pl-1 font-medium text-foreground" style={{ left: m.x, width: m.width }}>
            {m.label}
          </span>
        ))}
        {axis.columns
          .filter((c) => !c.weekend)
          .map((c) => (
            <span key={c.day} className="absolute bottom-1 text-center tabular-nums" style={{ left: c.x, width: c.width }}>
              {c.width >= 56 ? `${weekday(c.iso)} ${Number(c.iso.slice(8))}` : Number(c.iso.slice(8))}
            </span>
          ))}
      </div>
    </div>
  );
}

/** REQ-MILESTONE-UI-014: arrows under the bars; the pointed chain stands out, the rest fades. */
function Arrows({ rows, axis, label, height, chain }: { rows: Row[]; axis: Axis; label: number; height: number; chain: Set<string> | null }) {
  const id = useId().replace(/[^\w-]/g, "");
  const tones = { muted: "text-muted-foreground", late: "text-state-blocked", hot: "text-foreground" } as const;
  return (
    <svg aria-hidden className="pointer-events-none absolute top-0" style={{ left: label }} width={axis.width} height={height}>
      <defs>
        {Object.entries(tones).map(([tone, text]) => (
          <marker key={tone} id={`${id}-${tone}`} className={text} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
          </marker>
        ))}
      </defs>
      {dependencyArrows(rows, axis).map((a) => {
        const on = chain !== null && chain.has(a.from) && chain.has(a.to);
        const tone = a.late ? "late" : on ? "hot" : "muted";
        return (
          <path
            key={`${a.from} ${a.to}`}
            data-from={a.from}
            data-to={a.to}
            data-late={a.late || undefined}
            data-state={chain === null ? undefined : on ? "hot" : "faded"}
            d={a.path}
            fill="none"
            stroke="currentColor"
            strokeWidth={on ? 2 : 1.5}
            markerEnd={`url(#${id}-${tone})`}
            className={cn(tones[tone], chain !== null && !on && "opacity-20", "motion-safe:transition-opacity")}
          />
        );
      })}
    </svg>
  );
}

function EpicRow({
  project,
  row,
  axis,
  label,
  today,
  kids,
  open,
  faded,
  onToggle,
  onHot,
}: {
  project: string;
  row: Row & { kind: "epic" };
  axis: Axis;
  label: number;
  today: string;
  kids: readonly BeadSummary[];
  open: boolean;
  faded: boolean;
  onToggle: () => void;
  onHot: () => void;
}) {
  const { epic } = row;
  const look = lookOf(epic.status);
  const Icon = look.icon;
  const days = beadsOf(epic);
  const x0 = xOf(axis, days[0]);
  const x1 = endOf(axis, days[days.length - 1]);
  const unestimated = epic.estimate_days === null;
  const closed = kids.filter((b) => b.status === "closed").length;
  const fade = cn("motion-safe:transition-opacity", faded && "opacity-35");
  return (
    <li data-epic={epic.id} data-faded={faded || undefined} onMouseEnter={onHot} onFocus={onHot} className="flex border-b" style={{ height: row.height }}>
      <div className="sticky left-0 z-10 flex flex-none flex-col justify-center gap-0.5 bg-card px-3" style={{ width: label }}>
        <div className={cn("flex min-w-0 flex-col gap-0.5", fade)}>
          <span className="flex min-w-0 items-center gap-1.5 text-sm">
            {kids.length > 0 ? (
              <button
                type="button"
                aria-expanded={open}
                aria-label={`${open ? "Hide" : "Show"} ${plural(kids.length, "child bead")} of ${epic.id}`}
                onClick={onToggle}
                className="flex size-5 flex-none items-center justify-center rounded text-muted-foreground hover:bg-muted"
              >
                <ChevronRight aria-hidden className={cn("size-3.5 motion-safe:transition-transform", open && "rotate-90")} />
              </button>
            ) : (
              <span aria-hidden className="size-5 flex-none" />
            )}
            <Icon role="img" aria-label={look.label} className={cn("size-3.5 flex-none", look.text)} />
            <span title={epic.title} className="min-w-0 truncate font-medium">
              {epic.title}
            </span>
          </span>
          {/* on wide screens only the id shrinks; it keeps 64 px, so its link stays reachable on a phone */}
          <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap pl-[26px] text-xs text-muted-foreground">
            <span title={epic.id} className="min-w-16 shrink-[100] truncate">
              <Link to={`/beads/${enc(project)}/${enc(epic.id)}`} className="font-mono underline-offset-2 hover:underline">
                {epic.id}
              </Link>
            </span>
            <span className="min-w-0 truncate lg:shrink-0">{`${periodOf(epic.planned_start, epic.planned_end, today)}, ${unestimated ? "no estimate" : `${epic.estimate_days}d`}`}</span>
            {kids.length > 0 && <span className="min-w-0 truncate lg:shrink-0">{`${closed}/${kids.length} closed`}</span>}
          </span>
          {warningLines(epic, today).map((text) => (
            <span key={text} title={text} className="flex min-w-0 items-center gap-1 pl-[26px] text-xs text-state-blocked">
              <TriangleAlert aria-hidden className="size-3 flex-none" />
              <span className="min-w-0 truncate">{text}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={cn("relative flex-none", fade)} style={{ width: axis.width }}>
        <div
          aria-hidden
          className={cn("absolute motion-safe:transition-transform motion-safe:duration-150", look.text)}
          style={{ top: BAR_TOP, height: BEAD_HEIGHT, transform: `translateX(${x0}px)`, width: x1 - x0 }}
        >
          {days.length > 1 && <span className="absolute inset-x-2 top-1/2 h-px bg-current" />}
          {days.map((day) => (
            <span
              key={day}
              data-bead={isoOf(day)}
              className={cn("absolute inset-y-0 rounded-full", unestimated ? "border border-dashed border-muted-foreground bg-card" : look.fill)}
              style={{ left: xOf(axis, day) - x0 + 2, width: endOf(axis, day) - xOf(axis, day) - 4 }}
            />
          ))}
        </div>
        {axis.width - x1 >= TAIL_ROOM && (
          <span
            data-tail
            aria-hidden
            className="absolute truncate text-xs text-muted-foreground"
            style={{ left: x1 + 8, top: BAR_TOP, lineHeight: `${BEAD_HEIGHT}px`, maxWidth: axis.width - x1 - 16 }}
          >
            {epic.title}
          </span>
        )}
      </div>
    </li>
  );
}

/** REQ-MILESTONE-UI-015: a child bead under its expanded epic; the epic's period shaded, no bar. */
function ChildRow({ project, row, axis, label, today, faded }: { project: string; row: Row & { kind: "child" }; axis: Axis; label: number; today: string; faded: boolean }) {
  const { epic, bead } = row;
  const look = lookOf(bead.status);
  const Icon = look.icon;
  const days = beadsOf(epic);
  const x0 = xOf(axis, days[0]);
  const x1 = endOf(axis, days[days.length - 1]);
  const shortId = bead.id.startsWith(epic.id) ? bead.id.slice(epic.id.length) : bead.id;
  const state = bead.status === "closed" && bead.closed_at !== null ? `closed ${shortDate(bead.closed_at.slice(0, 10), today)}` : look.label;
  const fade = cn("motion-safe:transition-opacity", faded && "opacity-35");
  return (
    <li data-child={bead.id} data-faded={faded || undefined} className="flex border-b" style={{ height: row.height }}>
      <div className="sticky left-0 z-10 flex flex-none items-center bg-card pr-3 pl-3" style={{ width: label }}>
        <span className={cn("flex min-w-0 flex-1 items-center gap-1.5 pl-[26px] text-xs", fade)}>
          <Icon role="img" aria-label={look.label} className={cn("size-3 flex-none", look.text)} />
          <span title={bead.id} className="flex-none">
            <Link to={`/beads/${enc(project)}/${enc(bead.id)}`} className="font-mono text-muted-foreground underline-offset-2 hover:underline">
              {shortId}
            </Link>
          </span>
          <span title={bead.title} className="min-w-0 flex-1 truncate">
            {bead.title}
          </span>
          <span className="flex-none text-muted-foreground">{state}</span>
        </span>
      </div>
      <div className={cn("relative flex-none", fade)} style={{ width: axis.width }}>
        <span data-shade aria-hidden className="absolute inset-y-1.5 rounded bg-foreground/5" style={{ left: x0, width: x1 - x0 }} />
      </div>
    </li>
  );
}
