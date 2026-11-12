import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DeliverySection as Delivery, Stat, TimeRow } from "./api";
import { ChartBox, legendText } from "./ChartBox";
import { TYPES, present, typeColor } from "./colors";
import { beadPath, estimateDiff } from "./format";
import { RangeChart, type Range } from "./RangeChart";

const tick = { fill: "var(--color-muted-foreground)" };
const tooltipStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)" };
const heads = (names: string[]) => (
  <TableHeader>
    <TableRow>
      {names.map((name) => (
        <TableHead key={name}>{name}</TableHead>
      ))}
    </TableRow>
  </TableHeader>
);

const rangesOf = (rows: TimeRow[], pick: (r: TimeRow) => Stat | null): Range[] =>
  rows.flatMap((r) => {
    const s = pick(r);
    return s === null ? [] : [{ key: r.key, ...s }];
  });

export function DeliverySection({ delivery }: { delivery: Delivery }) {
  const [by, setBy] = useState<"type" | "member">("type");
  const types = present(TYPES, delivery.weeks.flatMap((w) => Object.keys(w.counts)));
  if (!delivery.weeks.some((w) => Object.values(w.counts).some((n) => n > 0))) {
    return <p className="text-muted-foreground">No data in this period</p>;
  }
  const times = by === "type" ? delivery.by_type : delivery.by_member;
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Closed per week</h2>
        <ChartBox height={240}>
          <BarChart data={delivery.weeks.map((w) => ({ week: w.week, ...w.counts }))}>
            <CartesianGrid stroke="var(--color-border)" />
            <XAxis dataKey="week" tick={tick} />
            <YAxis allowDecimals={false} tick={tick} />
            <Tooltip contentStyle={tooltipStyle} />
            {types.length >= 2 && <Legend formatter={legendText} />}
            {types.map((type, i) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="w"
                fill={typeColor(type)}
                stroke="var(--color-background)"
                strokeWidth={2}
                radius={i === types.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartBox>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Cycle and lead time</h2>
          <div role="group" aria-label="Group times" className="flex gap-1">
            {(["type", "member"] as const).map((value) => (
              <Button key={value} type="button" size="sm" variant={by === value ? "default" : "outline"} aria-pressed={by === value} onClick={() => setBy(value)}>
                {value === "type" ? "By type" : "By member"}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Dot is the median, the end tick is the 85th percentile. Cycle runs from start to close, lead from creation to close.</p>
        <div className="grid gap-6 md:grid-cols-2">
          <RangeChart title="Cycle time" ranges={rangesOf(times, (r) => r.cycle)} />
          <RangeChart title="Lead time" ranges={rangesOf(times, (r) => r.lead)} />
        </div>
      </section>
      {delivery.estimates.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Estimate and actual</h2>
          <Table>
            {heads(["Epic", "Estimate (working days)", "Actual (working days)", "Difference"])}
            <TableBody>
              {delivery.estimates.map((e) => {
                const diff = estimateDiff(e.estimate_days, e.actual_days);
                return (
                  <TableRow key={`${e.project}/${e.id}`}>
                    <TableCell>
                      <Link to={beadPath(e.project, e.id)} className="underline">
                        {e.id} — {e.title}
                      </Link>
                    </TableCell>
                    <TableCell>{e.estimate_days}</TableCell>
                    <TableCell>{e.actual_days}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(diff.late && "text-state-blocked")}>{diff.text}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
