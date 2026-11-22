import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";
import type { DaysPerPoint } from "@/features/milestones/api";
import { oneDecimal, percent, twoDecimals } from "@/features/milestones/format";
import type { VelocityPoint } from "./velocity";

const hintOf: Record<string, string | undefined> = { "Days per point": DEFINITIONS.daysPerPoint, "Commitment met": DEFINITIONS.commitmentMet };

/** REQ-REPORTS-018: days per point (with "assumed"), and the say/do and accuracy of the latest milestone that has one. */
export function VelocityFigures({ daysPerPoint, latest }: { daysPerPoint: DaysPerPoint | null; latest: VelocityPoint | null }) {
  const items: [string, string][] = [
    ["Days per point", daysPerPoint === null ? "—" : `${oneDecimal(daysPerPoint.value)} days per point`],
    ["Commitment met", latest?.velocity.say_do == null ? "—" : percent(latest.velocity.say_do)],
    ["Accuracy", latest?.velocity.accuracy == null ? "—" : twoDecimals(latest.velocity.accuracy)],
  ];
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col-reverse">
          <dt className="text-xs text-muted-foreground">
            {hintOf[label] === undefined ? label : <Hint text={hintOf[label]}><span>{label}</span></Hint>}
            {label === "Days per point" && daysPerPoint?.assumed === true && <span className="ml-1">assumed</span>}
            {label !== "Days per point" && latest !== null && <span className="ml-1">{latest.id}</span>}
          </dt>
          <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
