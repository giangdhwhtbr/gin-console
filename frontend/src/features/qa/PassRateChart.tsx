import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartBox, legendText } from "../reports/ChartBox";
import { tick, tooltipStyle } from "../reports/velocity/VelocityCharts";
import type { PassRateRow } from "./api";

const percent = (value: unknown) => (typeof value === "number" ? `${value} %` : "no runs");

/** REQ-QA-018: the pass rate per day, one line per capability; a day without a run is a gap, not zero. */
export function PassRateChart({ rows, days }: { rows: readonly PassRateRow[]; days: readonly string[] }) {
  const data = days.map((date, at) => ({
    date,
    ...Object.fromEntries(rows.map((row) => [row.name, row.points[at]?.rate == null ? null : Math.round(row.points[at].rate * 100)])),
  }));
  const names = rows.map((row) => row.name).sort();
  return (
    <div role="img" aria-label={`Pass rate per day by capability, ${days[0] ?? ""} to ${days[days.length - 1] ?? ""}`}>
      <ChartBox height={240}>
        <LineChart data={data}>
          <CartesianGrid stroke="var(--color-border)" />
          <XAxis dataKey="date" tick={tick} tickMargin={8} />
          <YAxis domain={[0, 100]} unit=" %" tick={tick} tickMargin={8} />
          <Tooltip contentStyle={tooltipStyle} formatter={percent} />
          <Legend formatter={legendText} />
          {rows.map((row) => (
            <Line key={row.name} dataKey={row.name} stroke={`var(--series-${names.indexOf(row.name) + 1})`} connectNulls={false} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ChartBox>
    </div>
  );
}
