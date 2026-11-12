import type { TeamMilestone } from "../teamApi";
import { UNASSIGNED } from "../teamApi";

/** A bead in progress for this many days or more is marked as slow. */
export const WARN_DAYS = 3;

const DAY_MS = 86_400_000;

/** Weekdays in (from, to]; 0 when `to` is not after `from`. Dates are ISO `YYYY-MM-DD`. */
export function workdaysAfter(from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  let count = 0;
  for (let t = start + DAY_MS; t <= end; t += DAY_MS) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

/** The chart color of a member: its place in `members` (cycling the 8 series colors), muted for Unassigned. */
export function memberColor(members: readonly string[], member: string): string {
  if (member === UNASSIGNED) return "var(--color-muted-foreground)";
  const index = Math.max(0, members.indexOf(member));
  return `var(--series-${(index % 8) + 1})`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const formatDate = (iso: string): string => dateFormat.format(new Date(iso));

/** Working days a closed milestone finished after its end; 0 when on time or not closed. */
export const lateDays = (m: TeamMilestone): number => (m.closed_on === null ? 0 : workdaysAfter(m.end, m.closed_on));
