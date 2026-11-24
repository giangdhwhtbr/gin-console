import { workdaysAfter } from "@/features/milestones/format";
import type { TeamMilestone } from "../teamApi";
import { UNASSIGNED } from "../teamApi";

/** A bead in progress for this many days or more is marked as slow. */
export const WARN_DAYS = 3;

/** The chart color of a member: its place in `members` (cycling the 8 series colors), muted for Unassigned. */
export function memberColor(members: readonly string[], member: string): string {
  if (member === UNASSIGNED) return "var(--color-muted-foreground)";
  const index = Math.max(0, members.indexOf(member));
  return `var(--series-${(index % 8) + 1})`;
}

/** Working days a closed milestone finished after its end; 0 when on time or not closed. */
export const lateDays = (m: TeamMilestone): number => (m.closed_on === null ? 0 : workdaysAfter(m.end, m.closed_on));

/** Story points as an integer when whole, else to one decimal. */
export const formatPoints = (points: number): string => (Number.isInteger(points) ? String(points) : points.toFixed(1));
