import type { BeadSummary } from "@/features/beads/api";
import { childCounts, prepLabel } from "@/features/beads/prep";
import type { EpicPlan, MilestoneDetail } from "./api";
import { monthName, plural, shortDate, utcOf } from "./format";

const DAY_MS = 86_400_000;
export const WEEKEND_WIDTH = 8;

/** Whole UTC days since 1970-01-01. */
export const dayOf = (iso: string) => Math.round(utcOf(iso).getTime() / DAY_MS);
export const isoOf = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
export const isWeekend = (day: number) => {
  const weekday = new Date(day * DAY_MS).getUTCDay();
  return weekday === 0 || weekday === 6;
};

export type Column = { day: number; iso: string; weekend: boolean; x: number; width: number };
export type Axis = { first: number; last: number; columns: Column[]; width: number };

/** The first and last day of the milestone, its schedule and every epic. */
export function boundsOf(plan: MilestoneDetail): { first: number; last: number } {
  const days = [
    plan.schedule_start,
    plan.start,
    plan.end,
    ...(plan.finish === null ? [] : [plan.finish]),
    ...plan.epics.flatMap((e) => [e.planned_start, e.planned_end]),
  ].map(dayOf);
  return { first: Math.min(...days), last: Math.max(...days) };
}

/** One column per calendar day over `boundsOf(plan)`, widened to whole Monday–Sunday weeks when zoomed; weekend columns are narrow. */
export function axisOf(plan: MilestoneDetail, dayWidth: number, zoom: Zoom = "all"): Axis {
  const bounds = boundsOf(plan);
  const first = zoom === "all" ? bounds.first : mondayOf(bounds.first);
  const last = zoom === "all" ? bounds.last : mondayOf(bounds.last) + 6;
  const columns: Column[] = [];
  let x = 0;
  for (let day = first; day <= last; day += 1) {
    const weekend = isWeekend(day);
    const width = weekend ? WEEKEND_WIDTH : dayWidth;
    columns.push({ day, iso: isoOf(day), weekend, x, width });
    x += width;
  }
  return { first, last, columns, width: x };
}

const columnOf = (axis: Axis, day: number): Column | undefined => axis.columns[day - axis.first];
export const xOf = (axis: Axis, day: number) => columnOf(axis, day)?.x ?? 0;
export const endOf = (axis: Axis, day: number) => {
  const c = columnOf(axis, day);
  return c === undefined ? 0 : c.x + c.width;
};
export const middleOf = (axis: Axis, day: number): number | null => {
  const c = columnOf(axis, day);
  return c === undefined ? null : c.x + c.width / 2;
};

/** The working days of an epic, one bead each; an epic without a working day is one bead on its start. */
export function beadsOf(epic: EpicPlan): number[] {
  const days: number[] = [];
  for (let day = dayOf(epic.planned_start); day <= dayOf(epic.planned_end); day += 1) {
    if (!isWeekend(day)) days.push(day);
  }
  return days.length > 0 ? days : [dayOf(epic.planned_start)];
}

export const sortEpics = (epics: readonly EpicPlan[]) =>
  [...epics].sort(
    (a, b) => a.planned_start.localeCompare(b.planned_start) || a.planned_end.localeCompare(b.planned_end) || a.id.localeCompare(b.id),
  );

/** Space kept free between two day numbers (REQ-UI-110: texts that touch run together). */
export const LABEL_GAP = 6;
const DIGIT_WIDTH = 6.5; // an 11px tabular digit, rounded up

/**
 * The days of the header that get a number (REQ-MILESTONE-UI-013): every working day when its column fits a
 * two-digit number plus LABEL_GAP, else every 2nd working day, else Mondays (always at least `need` apart, so no further step).
 * The first working day of each month is always labelled; a number that would then sit closer than the gap to it is dropped.
 */
export function labelledDays(axis: Axis): Set<number> {
  const working = axis.columns.filter((c) => !c.weekend);
  const dayWidth = working[0]?.width ?? 0;
  const need = (working.length > 0 && dayWidth >= 56 ? 6 : 2) * DIGIT_WIDTH + LABEL_GAP; // "Mon 9" is wider
  const mondays = working.filter((c) => new Date(c.day * DAY_MS).getUTCDay() === 1);
  let shown: Column[];
  if (dayWidth >= need) shown = working;
  else if (2 * dayWidth >= need) shown = working.filter((_, i) => i % 2 === 0);
  else shown = mondays; // Monday to Monday is 5 columns and a weekend: over 56px at the narrowest column
  const centre = (c: Column) => c.x + c.width / 2;
  const firsts = working.filter((c, i) => i === 0 || c.iso.slice(0, 7) !== working[i - 1].iso.slice(0, 7));
  const kept = shown.filter((c) => firsts.every((f) => f.day === c.day || Math.abs(centre(f) - centre(c)) >= need));
  return new Set([...kept, ...firsts].map((c) => c.day));
}

export type Month = { key: string; label: string; x: number; width: number };

export function monthsOf(axis: Axis, today: string): Month[] {
  const months: Month[] = [];
  for (const c of axis.columns) {
    const key = c.iso.slice(0, 7);
    const last = months.at(-1);
    if (last?.key === key) {
      last.width += c.width;
    } else {
      const year = key.slice(0, 4) === today.slice(0, 4) ? "" : ` ${key.slice(0, 4)}`;
      months.push({ key, label: `${monthName(Number(key.slice(5)) - 1)}${year}`, x: c.x, width: c.width });
    }
  }
  return months;
}

export function warningLines(epic: EpicPlan, today: string, integration: string | null): string[] {
  return epic.warnings.flatMap((w) => {
    switch (w.code) {
      case "overflow":
        return [`${w.days ?? 0} working ${w.days === 1 ? "day" : "days"} past the end`];
      case "late":
        return [`Late: should have finished ${shortDate(epic.planned_end, today)}`];
      case "unestimated":
        return ["No estimate"];
      case "spec_not_ready":
        return ["Spec not confirmed"];
      case "spec_due":
        return ["Spec due before kick-off"];
      case "after_integration":
        return [integration === null ? "Ends after integration" : `Ends after integration on ${shortDate(integration, today)}`];
      case "open_bugs":
        return [plural(w.count ?? 0, "open bug")];
      case "oversized":
        return [`${plural(w.days ?? 0, "working day")} longer than the milestone`];
      case "external_blocker":
        return epic.external_depends_on.map(
          (d) => `Blocked by ${d.id} (${d.milestone === null ? "not in a milestone" : `in ${d.milestone}`})`,
        );
      default:
        return [w.code];
    }
  });
}

export const periodOf = (from: string, to: string, today: string) =>
  from === to ? shortDate(from, today) : `${shortDate(from, today)} – ${shortDate(to, today)}`;

/** REQ-MILESTONE-UI-011: the zoom modes; any other URL value shows the whole milestone. */
export type Zoom = "1w" | "2w" | "all";
export const zoomOf = (param: string | null): Zoom => (param === "1w" || param === "2w" ? param : "all");
/** Calendar days in view for a zoomed mode; null for the whole milestone. */
export const spanOf = (zoom: Zoom): number | null => (zoom === "1w" ? 7 : zoom === "2w" ? 14 : null);
export const mondayOf = (day: number) => day - ((new Date(day * DAY_MS).getUTCDay() + 6) % 7);

/** Working days share what the weekend columns leave of `width`, never narrower than `floor`. */
export function fitDayWidth(first: number, last: number, width: number, floor: number): number {
  let working = 0;
  let weekends = 0;
  for (let day = first; day <= last; day += 1) {
    if (isWeekend(day)) weekends += 1;
    else working += 1;
  }
  return working === 0 ? floor : Math.max(floor, (width - weekends * WEEKEND_WIDTH) / working);
}

/** The day whose column holds `x`; the last day past the end. */
export const dayAt = (axis: Axis, x: number) => axis.columns.find((c) => x < c.x + c.width)?.day ?? axis.last;

/** REQ-MILESTONE-UI-011: the Monday of today's week when today is in the plan, else of the plan's first day. */
export function openingDay(plan: MilestoneDetail, axis: Axis): number {
  const { first, last } = boundsOf(plan);
  const today = dayOf(plan.today);
  return Math.max(axis.first, mondayOf(today >= first && today <= last ? today : first));
}

/** REQ-MILESTONE-UI-012: the Monday `span` days after, or the Monday at or `span` days before, `from`, kept on the axis. */
export function stepDay(axis: Axis, from: number, direction: 1 | -1, span: number): number {
  const monday = mondayOf(from);
  const next = direction === 1 ? monday + span : monday === from ? monday - span : monday;
  return Math.min(Math.max(next, axis.first), axis.last);
}

/** REQ-MILESTONE-UI-013: the label column is 300px under 1280px windows, 380px from 1280px and 440px from 1600px; 168px on a phone (under 1024px), so that the chart keeps some room. */
export const labelWidthOf = (windowWidth: number): number => (windowWidth >= 1600 ? 440 : windowWidth >= 1280 ? 380 : windowWidth >= 1024 ? 300 : 168);

/** REQ-MILESTONE-UI-013: room for a title after a bar ending at `barEnd`: up to the next stop (end or today line) at or after the bar, or `chartEnd`, with a gap on each side; never negative. */
export function tailWidth(barEnd: number, stops: readonly number[], chartEnd: number, gap = 8): number {
  const next = Math.min(chartEnd, ...stops.filter((x) => x >= barEnd));
  return Math.max(0, next - barEnd - 2 * gap);
}

export const HEADER_HEIGHT = 60;
const TODAY_CHIP = 44;
const END_CHIP = 100;

export type Markers = { today: "left" | "right"; end: "left" | "right"; todayShift: number };

/**
 * REQ-MILESTONE-UI-013: the side of its line each header chip sits on, so that none runs off the chart and the two never overlap.
 * `todayShift`: px the Today chip moves further left of its line when both chips would be on the left and still meet.
 */
export function markerSides(todayX: number | null, endX: number, width: number): Markers {
  const end = endX + 4 + END_CHIP > width ? "left" : "right";
  if (todayX === null) return { today: "right", end, todayShift: 0 };
  const span = (x: number, side: "left" | "right", w: number): [number, number] => (side === "right" ? [x + 4, x + 4 + w] : [x - 4 - w, x - 4]);
  const meets = (a: [number, number], b: [number, number]) => a[0] < b[1] + 4 && b[0] < a[1] + 4;
  const e = span(endX, end, END_CHIP);
  const right = span(todayX, "right", TODAY_CHIP);
  if (right[1] <= width && !meets(right, e)) return { today: "right", end, todayShift: 0 };
  const left = span(todayX, "left", TODAY_CHIP);
  if (!meets(left, e)) return { today: "left", end, todayShift: 0 };
  return { today: "left", end, todayShift: Math.max(0, left[1] - (e[0] - 4)) };
}

export const ROW_HEIGHT = 56;
export const WARNING_HEIGHT = 18;
export const LABEL_LINE = 16;
const LABEL_PADDING = 24;
export const CHILD_HEIGHT = 36;
export const BAR_TOP = 16;
export const BEAD_HEIGHT = 24;

export type Row =
  | { kind: "epic"; epic: EpicPlan; top: number; height: number }
  | { kind: "child"; epic: EpicPlan; bead: BeadSummary; top: number; height: number };

/** REQ-MILESTONE-UI-013: the spec item of the label, left out when the warnings already say the spec is not confirmed. */
export const showsSpec = (epic: EpicPlan): boolean => epic.spec_confirmed !== null && !epic.warnings.some((w) => w.code === "spec_not_ready");

/** REQ-MILESTONE-UI-013: below lg the meta items wrap, so the row holds the title and one line per item shown (id, period, tracks, prep, spec). */
function narrowHeight(epic: EpicPlan, kids: readonly BeadSummary[]): number {
  const counts = childCounts(kids);
  const items = 2 + Number(counts.tracks > 0) + Number(prepLabel(counts) !== null) + Number(showsSpec(epic));
  return Math.max(ROW_HEIGHT, LABEL_PADDING + LABEL_LINE * (1 + items));
}

/** Epic rows in `epics` order, each followed by its children when expanded; tops in px from the first row. `wide`: from lg up, rows keep ROW_HEIGHT. */
export function rowsOf(
  epics: readonly EpicPlan[],
  today: string,
  expanded: ReadonlySet<string>,
  children: ReadonlyMap<string, readonly BeadSummary[]>,
  wide = true,
): Row[] {
  const rows: Row[] = [];
  let top = 0;
  for (const epic of epics) {
    const base = wide ? ROW_HEIGHT : narrowHeight(epic, children.get(epic.id) ?? []);
    const height = base + WARNING_HEIGHT * warningLines(epic, today, null).length;
    rows.push({ kind: "epic", epic, top, height });
    top += height;
    if (!expanded.has(epic.id)) continue;
    for (const bead of children.get(epic.id) ?? []) {
      rows.push({ kind: "child", epic, bead, top, height: CHILD_HEIGHT });
      top += CHILD_HEIGHT;
    }
  }
  return rows;
}

export type Arrow = { from: string; to: string; path: string; late: boolean };

/** REQ-MILESTONE-UI-014: an arrow from the end of A's last bead to the start of B's first bead for each in-milestone `depends_on`. */
export function dependencyArrows(rows: readonly Row[], axis: Axis): Arrow[] {
  const epicRows = new Map(rows.flatMap((r) => (r.kind === "epic" ? [[r.epic.id, r] as const] : [])));
  const middle = (r: Row) => r.top + BAR_TOP + BEAD_HEIGHT / 2;
  return [...epicRows.values()].flatMap((rb) =>
    rb.epic.depends_on.flatMap((id) => {
      const ra = epicRows.get(id);
      if (ra === undefined) return [];
      const a = beadsOf(ra.epic);
      const edge = endOf(axis, a[a.length - 1]);
      const start = xOf(axis, beadsOf(rb.epic)[0]);
      const [ma, mb] = [middle(ra), middle(rb)];
      // too close to turn in front of B: run along B's row edge and enter from the left
      const turn = rb.top > ra.top ? rb.top : rb.top + rb.height;
      const path =
        start >= edge + 16
          ? `M${edge - 3} ${ma} H${edge} V${mb} H${start + 3}`
          : `M${edge - 3} ${ma} H${edge} V${turn} H${start - 8} V${mb} H${start + 3}`;
      return [{ from: id, to: rb.epic.id, path, late: rb.epic.planned_start <= ra.epic.planned_end }];
    }),
  );
}

/** REQ-MILESTONE-UI-014: `id`, the epics it depends on and the epics that depend on it, directly or through others. */
export function chainOf(epics: readonly EpicPlan[], id: string): Set<string> {
  const ids = new Set(epics.map((e) => e.id));
  const up = new Map(epics.map((e) => [e.id, e.depends_on.filter((d) => ids.has(d))]));
  const down = new Map<string, string[]>();
  for (const [b, as] of up) for (const a of as) down.set(a, [...(down.get(a) ?? []), b]);
  const walk = (links: Map<string, string[]>) => {
    const seen = [id];
    for (const current of seen) for (const next of links.get(current) ?? []) if (!seen.includes(next)) seen.push(next);
    return seen;
  };
  return new Set([...walk(up), ...walk(down)]);
}

/** REQ-MILESTONE-UI-015: beads by parent, each list ordered by id (".2" before ".10"). */
export function childrenOf(beads: readonly BeadSummary[]): Map<string, BeadSummary[]> {
  const byParent = new Map<string, BeadSummary[]>();
  for (const bead of beads) if (bead.parent !== null) byParent.set(bead.parent, [...(byParent.get(bead.parent) ?? []), bead]);
  for (const list of byParent.values()) list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return byParent;
}
