import { FactList, type Fact } from "@/components/FactList";
import type { Velocity } from "./api";
import { oneDecimal, percent, twoDecimals } from "./format";

/** REQ-MILESTONE-UI-021: the team's points for the milestone, as label/value facts (REQ-UI-110); nothing without a `velocity`, nothing per member. */
export function MilestoneVelocity({ velocity: v }: { velocity: Velocity | null }) {
  if (v === null) return null;
  const details = [
    v.planned_days_per_point !== null && `planned ${oneDecimal(v.planned_days_per_point)}`,
    v.accuracy !== null && `accuracy ${twoDecimals(v.accuracy)}`,
  ].filter(Boolean);
  const facts: Fact[] =
    v.committed_points === null
      ? [
          { label: "Kick-off", value: "Not kicked off" },
          { label: "Completed", value: `${v.completed_points} pt` },
        ]
      : [
          { label: "Committed", value: `${v.committed_points} pt` },
          { label: "Completed", value: `${v.completed_points} pt` },
          { label: "Added", value: `${v.added_points} pt` },
          { label: "Say/do", value: v.say_do === null ? "–" : percent(v.say_do) },
        ];
  if (v.days_per_point !== null) {
    facts.push({ label: "d/pt", value: `${oneDecimal(v.days_per_point)}${details.length > 0 ? ` (${details.join(", ")})` : ""}` });
  }
  return <FactList facts={facts} layout="inline" />;
}
