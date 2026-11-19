import type { Velocity } from "./api";
import { oneDecimal, percent, twoDecimals } from "./format";

/** REQ-MILESTONE-UI-021: the team's points for the milestone; nothing without a `velocity`, nothing per member. */
export function MilestoneVelocity({ velocity: v }: { velocity: Velocity | null }) {
  if (v === null) return null;
  const points =
    v.committed_points === null
      ? `Not kicked off · Completed ${v.completed_points} pt`
      : `Committed ${v.committed_points} pt · Completed ${v.completed_points} pt · Added ${v.added_points} pt · Say/do ${v.say_do === null ? "–" : percent(v.say_do)}`;
  const details = [
    v.planned_days_per_point !== null && `planned ${oneDecimal(v.planned_days_per_point)}`,
    v.accuracy !== null && `accuracy ${twoDecimals(v.accuracy)}`,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span>{points}</span>
      {v.days_per_point !== null && (
        <span>{`${oneDecimal(v.days_per_point)} d/pt${details.length > 0 ? ` (${details.join(", ")})` : ""}`}</span>
      )}
    </div>
  );
}
