import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { addWorkdays, utcOf } from "@/features/milestones/format";
import { formatDate } from "@/lib/dates";
import { ChartBox } from "../ChartBox";
import type { BurnupDay, Changes } from "./statusApi";

export type BurnupPoint = {
  day: string;
  scope: number | null;
  done: number | null;
  needed: number | null;
  forecast: number | null;
};

const tick = { fill: "var(--color-muted-foreground)", fontSize: 12 };
const formatNum = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function workingDaysRange(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = utcOf(start);
  const stop = utcOf(end).getTime();
  while (cursor.getTime() <= stop) {
    if (cursor.getUTCDay() % 6 !== 0) days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Builds the working-day rows for Scope, Done, Needed pace and Forecast, plus the warning wash bounds after `end`. */
export function buildBurnupSeries(
  burnup: readonly BurnupDay[],
  end: string,
  today: string,
  paceFinish: string | null,
): { rows: BurnupPoint[]; afterEnd: string | null; lastDay: string } {
  const firstDay = burnup[0].day;
  const lastBurnup = burnup[burnup.length - 1];
  const candidates = [end, today, lastBurnup.day, ...(paceFinish !== null ? [paceFinish] : [])];
  const lastDay = candidates.reduce((a, b) => (a >= b ? a : b));

  const daySet = new Set(workingDaysRange(firstDay, lastDay));
  for (const marker of [firstDay, end, today, lastBurnup.day, ...(paceFinish !== null ? [paceFinish] : [])]) {
    if (marker >= firstDay && marker <= lastDay) daySet.add(marker);
  }
  const days = [...daySet].sort();
  const byDay = new Map(burnup.map((b) => [b.day, b]));
  const forecastStart = today >= firstDay && today <= lastDay ? today : lastBurnup.day;

  const rows: BurnupPoint[] = days.map((day) => {
    const entry = byDay.get(day);
    let needed: number | null = null;
    if (day === firstDay) needed = 0;
    if (day === end) needed = lastBurnup.scope_points;

    let forecast: number | null = null;
    if (paceFinish !== null) {
      if (day === forecastStart) forecast = lastBurnup.done_points;
      if (day === paceFinish) forecast = lastBurnup.scope_points;
    }

    return {
      day,
      scope: entry?.scope_points ?? null,
      done: entry?.done_points ?? null,
      needed,
      forecast,
    };
  });

  const afterEnd = lastDay > end ? addWorkdays(end, 1) : null;
  return { rows, afterEnd, lastDay };
}

export function BurnupTooltip({
  active,
  payload,
  today,
}: {
  active?: boolean;
  payload?: readonly { payload?: BurnupPoint }[];
  today: string;
}) {
  if (!active || payload === undefined || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (point === undefined || (point.scope === null && point.done === null)) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
      <div className="font-semibold">{formatDate(point.day, today)}</div>
      {point.scope !== null && <div>Scope {formatNum(point.scope)} points</div>}
      {point.done !== null && <div>Done {formatNum(point.done)} points</div>}
    </div>
  );
}

/** REQ-REPORTS-029: burn-up chart of points done against scope, with needed pace, forecast, today/end lines and overflow wash. */
export function BurnupChart({
  burnup,
  end,
  today,
  paceFinish,
  changes,
}: {
  burnup: readonly BurnupDay[];
  end: string;
  today: string;
  paceFinish: string | null;
  changes: Changes;
}) {
  const first = burnup[0];
  const last = burnup[burnup.length - 1];
  const scopeFrom = changes.scope_from ?? first.scope_points;
  const scopeTo = changes.scope_to ?? last.scope_points;
  const label = `Burn-up: ${formatNum(last.done_points)} of ${formatNum(last.scope_points)} points done; scope ${formatNum(scopeFrom)} → ${formatNum(scopeTo)} points since kickoff`;
  const { rows, afterEnd, lastDay } = buildBurnupSeries(burnup, end, today, paceFinish);

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">Burn-up</h3>
        <p className="text-xs text-muted-foreground">Points done against scope. The scope line steps up when work is added after kickoff.</p>
      </div>
      <div role="img" aria-label={label} className="min-w-0">
        <ChartBox height={260}>
          <ComposedChart data={rows} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={tick} tickFormatter={(d: string) => formatDate(d, today)} tickMargin={8} />
            <YAxis domain={[0, "auto"]} allowDecimals={false} tick={tick} tickMargin={8} />
            <Tooltip content={(props) => <BurnupTooltip active={props.active} payload={props.payload} today={today} />} />
            {afterEnd !== null && afterEnd <= lastDay && (
              <ReferenceArea x1={afterEnd} x2={lastDay} fill="var(--state-blocked)" fillOpacity={0.12} />
            )}
            <ReferenceLine
              x={today}
              stroke="var(--color-identity)"
              strokeWidth={1.5}
              label={{ value: "Today", position: "top", fill: "var(--color-identity)", fontSize: 12 }}
            />
            <ReferenceLine
              x={end}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="3 3"
              label={{ value: `End ${formatDate(end, today)}`, position: "top", fill: "var(--color-muted-foreground)", fontSize: 12 }}
            />
            <Line
              type="stepAfter"
              dataKey="scope"
              name="Scope"
              stroke="var(--color-foreground)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="done"
              name="Done"
              stroke="var(--state-done)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="needed"
              name="Needed pace"
              stroke="var(--color-muted-foreground)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            {paceFinish !== null && (
              <Line
                type="linear"
                dataKey="forecast"
                name="Forecast"
                stroke="var(--state-done)"
                strokeDasharray="2 4"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ChartBox>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden className="inline-block w-4 border-t-2 border-foreground" />
          Scope
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden className="inline-block w-4 border-t-[3px] border-state-done" />
          Done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden className="inline-block w-4 border-t-2 border-dashed border-muted-foreground" />
          Needed pace
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden className="inline-block w-4 border-t-[3px] border-dotted border-state-done" />
          Forecast
        </span>
      </div>
    </section>
  );
}
