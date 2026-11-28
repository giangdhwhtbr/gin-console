import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { VELOCITY_COLORS } from "../colors";
import { ChartBox, legendText } from "../ChartBox";
import type { VelocityPoint } from "./velocity";

export const tick = { fill: "var(--color-muted-foreground)", fontSize: 12 };
export const tooltipStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)" };

const MARK = "var(--color-identity)";

/**
 * REQ-REPORTS-018: committed vs completed points, and days per point against the plan; null points are left out. The
 * `selected` milestone's columns are outlined in the identity colour, and a line in that colour marks it on the line chart.
 */
export function VelocityCharts({ points, selected }: { points: readonly VelocityPoint[]; selected: string | null }) {
  const marked = points.some((p) => p.id === selected) ? selected : null;
  const named = marked === null ? "" : `, ${marked} marked`;
  const outline = (id: string) => (id === marked ? { stroke: MARK, strokeWidth: 2 } : {});
  const data = points.map((p) => ({
    id: p.id,
    Committed: p.velocity.committed_points,
    Completed: p.velocity.completed_points,
    "Days per point": p.velocity.days_per_point,
    "Planned days per point": p.velocity.planned_days_per_point,
  }));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium">Committed and completed points</h3>
        <div role="img" aria-label={`Committed and completed points per milestone, as grouped columns${named}`}>
          <ChartBox height={220}>
            <BarChart data={data}>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis dataKey="id" tick={tick} tickMargin={8} />
              <YAxis allowDecimals={false} tick={tick} tickMargin={8} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend formatter={legendText} />
              <Bar dataKey="Committed" fill={VELOCITY_COLORS.committed} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.id} {...outline(d.id)} />
                ))}
              </Bar>
              <Bar dataKey="Completed" fill={VELOCITY_COLORS.completed} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.id} {...outline(d.id)} />
                ))}
              </Bar>
            </BarChart>
          </ChartBox>
        </div>
      </section>
      <section className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium">Days per point</h3>
        <div role="img" aria-label={`Days per point and planned days per point per milestone, as lines${named}`}>
          <ChartBox height={220}>
            <LineChart data={data}>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis dataKey="id" tick={tick} tickMargin={8} />
              <YAxis tick={tick} tickMargin={8} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend formatter={legendText} />
              {marked !== null && <ReferenceLine x={marked} stroke={MARK} strokeWidth={2} />}
              <Line dataKey="Days per point" stroke={VELOCITY_COLORS.daysPerPoint} connectNulls isAnimationActive={false} />
              <Line dataKey="Planned days per point" stroke={VELOCITY_COLORS.planned} strokeDasharray="4 3" connectNulls isAnimationActive={false} />
            </LineChart>
          </ChartBox>
        </div>
      </section>
    </div>
  );
}
