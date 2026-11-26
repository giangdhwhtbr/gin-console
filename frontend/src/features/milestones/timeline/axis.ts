import { formatDate } from "@/lib/dates";
import type { ClosedEpic, Forecast, ForecastEpic, ForecastMilestone, MilestoneEntry, MilestoneList } from "../api";
import { dayOf, isoOf, mondayOf } from "../gantt";
import { monthName, plural } from "../format";

/** REQ-MILESTONE-UI-036: how much of the axis one screen row shows; Months unless the URL says otherwise. */
export type Zoom = "weeks" | "months" | "quarters";
export const zoomOf = (param: string | null): Zoom => (param === "weeks" || param === "quarters" ? param : "months");
/** Pixels per calendar day. */
export const DAY_WIDTH: Record<Zoom, number> = { weeks: 24, months: 6, quarters: 2 };

export type Bar = { from: string; to: string };
export type EpicRow = {
  kind: "epic";
  id: string;
  title: string;
  status: string;
  closed: boolean;
  bar: Bar;
  lane: number | null;
  remaining: number | null;
  over: number | null;
  assumed: boolean;
  warned: boolean;
  /** The accessible name of the bar. */
  label: string;
};
export type Group =
  | {
      kind: "milestone";
      id: string;
      title: string;
      status: string;
      window: Bar | null;
      overrun: Bar | null;
      finish: string | null;
      noOpenEpics: boolean;
      epics: EpicRow[];
    }
  | { kind: "none"; epics: EpicRow[] };

type Placed = { milestone: string | null; row: EpicRow };

const DAY_MS = 86_400_000;
const shortDate = (iso: string) => formatDate(iso, iso);
const isClosed = (milestone: MilestoneEntry) => milestone.status === "closed";
const nextDay = (iso: string) => isoOf(dayOf(iso) + 1);

/** By `start`, the ones without a date last; the sort is stable. */
const byStart = (milestones: readonly MilestoneEntry[]) =>
  [...milestones].sort((a, b) => (a.start === b.start ? 0 : a.start === null ? 1 : b.start === null ? -1 : a.start < b.start ? -1 : 1));

function openRow(epic: ForecastEpic): Placed {
  const title = epic.title ?? epic.id;
  const over = epic.warnings.find((w) => w.code === "overflow")?.days ?? null;
  const assumed = epic.estimate_source === "assumed";
  const label = [
    `${title}: planned ${shortDate(epic.planned_start)} – ${shortDate(epic.planned_end)}`,
    ...(epic.remaining_days === null ? [] : [`${plural(epic.remaining_days, "day")} left`]),
    ...(over === null ? [] : [`${plural(over, "day")} over`]),
    ...(assumed ? ["assumed estimate"] : []),
  ].join(", ");
  return {
    milestone: epic.milestone,
    row: {
      kind: "epic",
      id: epic.id,
      title,
      status: epic.status ?? "open",
      closed: false,
      bar: { from: epic.planned_start, to: epic.planned_end },
      lane: epic.lane,
      remaining: epic.remaining_days,
      over,
      assumed,
      warned: epic.warnings.length > 0,
      label,
    },
  };
}

function closedRow(epic: ClosedEpic): Placed {
  return {
    milestone: epic.milestone,
    row: {
      kind: "epic",
      id: epic.id,
      title: epic.title,
      status: "closed",
      closed: true,
      bar: { from: epic.start, to: epic.end },
      lane: null,
      remaining: null,
      over: null,
      assumed: false,
      warned: false,
      label: `${epic.title}: ${shortDate(epic.start)} – ${shortDate(epic.end)}, closed`,
    },
  };
}

function groupOf(
  milestone: MilestoneEntry,
  chain: ForecastMilestone | undefined,
  failed: boolean,
  epics: EpicRow[],
): Group {
  const closed = isClosed(milestone);
  const finish = closed ? milestone.finish : (chain?.finish ?? null);
  const window = milestone.start !== null && milestone.end !== null ? { from: milestone.start, to: milestone.end } : null;
  const hatched = !failed && !closed && window !== null && finish !== null && finish > window.to;
  return {
    kind: "milestone",
    id: milestone.id,
    title: milestone.title,
    status: milestone.status,
    window,
    overrun: hatched ? { from: nextDay(window.to), to: finish } : null,
    finish,
    noOpenEpics: !closed && chain !== undefined && chain.start === null && chain.finish === null,
    epics,
  };
}

/**
 * REQ-MILESTONE-UI-035, 037, 038: the groups of the Timeline, in order: closed milestones (with `showClosed`) by start, the
 * chained milestones in the order of `forecast.milestones`, the other open milestones with dates by start, then "Not in a milestone"
 * (left out when empty). Epics keep the order of `forecast.epics`, after the closed ones. With `forecast.error` the open epics
 * and the overrun are left out; open milestones outside the chain have no `finish`.
 */
export function timelineGroups(list: MilestoneList, showClosed: boolean): Group[] {
  const forecast = list.forecast;
  const failed = forecast !== null && forecast.error !== null;
  const chain = new Map((forecast?.milestones ?? []).map((m) => [m.id, m]));
  const open = list.milestones.filter((m) => !isClosed(m));
  const entries = [
    ...(showClosed ? byStart(list.milestones.filter(isClosed)) : []),
    ...(forecast?.milestones ?? []).flatMap((m) => open.filter((o) => o.id === m.id)),
    ...byStart(open.filter((m) => !chain.has(m.id) && m.start !== null && m.end !== null)),
  ];
  const placed: Placed[] = [
    ...(showClosed ? (list.closed_epics ?? []).map(closedRow) : []),
    ...(failed ? [] : (forecast?.epics ?? []).map(openRow)),
  ];
  const listed = new Set(entries.map((m) => m.id));
  const groups = entries.map((m) =>
    groupOf(
      m,
      chain.get(m.id),
      failed,
      placed.filter((p) => p.milestone === m.id).map((p) => p.row),
    ),
  );
  const loose = placed.filter((p) => p.milestone === null || !listed.has(p.milestone)).map((p) => p.row);
  return loose.length === 0 ? groups : [...groups, { kind: "none", epics: loose }];
}

/** REQ-MILESTONE-UI-036: the days the axis covers, from the earliest bar start to the latest of the bar ends, the forecast finish, the deadline and today; today is always inside. */
export function spanOf(groups: readonly Group[], forecast: Forecast | null, today: string): { first: number; last: number } {
  const bars = groups.flatMap((g) => [
    ...(g.kind === "milestone" ? [g.window, g.overrun] : []),
    ...g.epics.map((e) => e.bar),
  ]);
  const todayDay = dayOf(today);
  const ends = [forecast?.finish ?? null, forecast?.deadline ?? null].flatMap((iso) => (iso === null ? [] : [dayOf(iso)]));
  const present = bars.flatMap((bar) => (bar === null ? [] : [bar]));
  return {
    first: Math.min(todayDay, ...present.map((bar) => dayOf(bar.from))),
    last: Math.max(todayDay, ...ends, ...present.map((bar) => dayOf(bar.to))),
  };
}

export type Tick = { day: number; label: string };

const monthStart = (year: number, month: number) => Date.UTC(year, month, 1) / DAY_MS;

/** The 1st of every month (every third one for quarters) after `first` up to `last`. */
function monthStarts(first: number, last: number, every: number): { day: number; year: number; month: number }[] {
  const iso = isoOf(first);
  const found: { day: number; year: number; month: number }[] = [];
  for (let n = Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1; ; n += 1) {
    const year = Math.floor(n / 12);
    const month = n % 12;
    const day = monthStart(year, month);
    if (day > last) return found;
    if (day > first && month % every === 0) found.push({ day, year, month });
  }
}

const quarterLabel = (year: number, month: number) => `Q${Math.floor(month / 3) + 1} ${year}`;

/** REQ-MILESTONE-UI-036: the axis header: Mondays ("21 Dec"), months ("Nov 2026" for `first` and each January, else "Dec") or quarters ("Q1 2027"). */
export function ticksOf(zoom: Zoom, first: number, last: number): Tick[] {
  if (zoom === "weeks") {
    const monday = mondayOf(first);
    const start = monday < first ? monday + 7 : monday;
    const count = Math.max(0, Math.floor((last - start) / 7) + 1);
    return Array.from({ length: count }, (_, n) => ({ day: start + 7 * n, label: shortDate(isoOf(start + 7 * n)) }));
  }
  const iso = isoOf(first);
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7)) - 1;
  if (zoom === "months") {
    const later = monthStarts(first, last, 1).map((m) => ({ day: m.day, label: m.month === 0 ? `${monthName(m.month)} ${m.year}` : monthName(m.month) }));
    return [{ day: first, label: `${monthName(month)} ${year}` }, ...later];
  }
  return [{ day: first, label: quarterLabel(year, month) }, ...monthStarts(first, last, 3).map((m) => ({ day: m.day, label: quarterLabel(m.year, m.month) }))];
}

/** The x of the start of `day` on the axis, in pixels. */
export const xOfDay = (day: number, first: number, zoom: Zoom): number => (day - first) * DAY_WIDTH[zoom];
