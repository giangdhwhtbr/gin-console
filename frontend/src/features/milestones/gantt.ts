import type { EpicPlan, MilestoneDetail } from "./api";
import { monthName, shortDate, utcOf } from "./format";

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

/** One column per calendar day over the milestone, its schedule and every epic; weekend columns are narrow. */
export function axisOf(plan: MilestoneDetail, dayWidth: number): Axis {
  const days = [
    plan.schedule_start,
    plan.start,
    plan.end,
    ...(plan.finish === null ? [] : [plan.finish]),
    ...plan.epics.flatMap((e) => [e.planned_start, e.planned_end]),
  ].map(dayOf);
  const first = Math.min(...days);
  const last = Math.max(...days);
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

export function warningLines(epic: EpicPlan, today: string): string[] {
  return epic.warnings.flatMap((w) => {
    switch (w.code) {
      case "overflow":
        return [`${w.days ?? 0} working ${w.days === 1 ? "day" : "days"} past the end`];
      case "late":
        return [`Late: should have finished ${shortDate(epic.planned_end, today)}`];
      case "unestimated":
        return ["No estimate"];
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
