import { field, isFiniteNumber, isString } from "@/lib/guards";

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isNumberOrNull = (value: unknown) => value === null || isFiniteNumber(value);
/** A value that starts with an ISO day, so that date arithmetic on it cannot throw. */
const isDay = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value.slice(0, 10)));
const at = (value: unknown, key: string): unknown => (isObject(value) ? field(value, key) : undefined);
const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);

const isMilestone = (value: unknown) =>
  isString(at(value, "id")) &&
  isString(at(value, "status")) &&
  isDay(at(value, "start")) &&
  isDay(at(value, "end")) &&
  (at(value, "closed_on") === null || isDay(at(value, "closed_on")));

const isEpic = (value: unknown) => isString(at(value, "status")) && isNumberOrNull(at(value, "points")) && isFiniteNumber(at(at(value, "child_counts"), "total"));

/** Whether a status report holds every field the verdict and its line read (REQ-OVERVIEW-007); `fetchStatus` checks only its outline. */
export function isReadableStatus(report: unknown): boolean {
  const kpis = at(report, "kpis");
  const milestone = at(report, "milestone");
  return (
    isDay(at(report, "today")) &&
    (milestone === null || isString(milestone)) &&
    every(at(report, "milestones"), isMilestone) &&
    every(at(report, "epics"), isEpic) &&
    isNumberOrNull(at(at(kpis, "beads"), "scope")) &&
    isNumberOrNull(at(at(kpis, "beads"), "done")) &&
    isNumberOrNull(at(at(kpis, "points"), "scope")) &&
    isNumberOrNull(at(at(kpis, "pace"), "pace")) &&
    isFiniteNumber(at(at(kpis, "blocked"), "count")) &&
    Array.isArray(at(at(report, "risks"), "unestimated"))
  );
}
