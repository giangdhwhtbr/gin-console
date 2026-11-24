import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { milestonePath } from "@/features/milestones/api";
import { twoDecimals } from "@/features/milestones/format";
import { cn } from "@/lib/utils";
import { ChartBox } from "../ChartBox";
import { formatPercent } from "../format";
import type { TrendRow } from "../teamApi";
import { formatPoints } from "./format";

const HEADS = ["Milestone", "Closed", "Points", "On time", "Rework", "Accuracy"] as const;
const tick = { fill: "var(--color-muted-foreground)", fontSize: 12 };
const tooltipStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)" };
const MARK = "var(--color-identity)";

/** REQ-REPORTS-036: points delivered column chart and summary table across the latest started milestones. */
export function AcrossMilestones({
  project,
  trend,
  selected,
}: {
  project: string;
  trend: readonly TrendRow[];
  selected: string | null;
}) {
  if (trend.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Across milestones</h2>
        <p className="text-sm text-muted-foreground">No started milestones yet</p>
      </section>
    );
  }
  const marked = trend.some((r) => r.id === selected) ? selected : null;
  const named = marked === null ? "" : `, ${marked} marked`;
  const data = trend.map((row) => ({ id: row.id, title: row.title, Points: row.points_delivered }));
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold">Across milestones</h2>
      <div role="img" aria-label={`Points delivered per milestone, as columns${named}`}>
        <ChartBox height={220}>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--color-border)" />
            <XAxis dataKey="title" tick={tick} tickMargin={8} />
            <YAxis allowDecimals={false} tick={tick} tickMargin={8} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="Points" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.id} {...(d.id === marked ? { stroke: MARK, strokeWidth: 2 } : {})} />
              ))}
            </Bar>
          </BarChart>
        </ChartBox>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {HEADS.map((head, i) => (
              <TableHead key={head} className={i === 0 ? undefined : "text-right"}>
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {trend.map((row) => {
            const isSelected = row.id === selected;
            return (
              <TableRow key={row.id} aria-current={isSelected ? "true" : undefined} className={cn(isSelected && "bg-muted")}>
                <TableCell>
                  <Link to={milestonePath(project, row.id)} className="hover:text-identity">
                    {row.title}
                  </Link>
                </TableCell>
                <TableCell className="text-right">{row.closed}</TableCell>
                <TableCell className="text-right">{formatPoints(row.points_delivered)}</TableCell>
                <TableCell className="text-right">{formatPercent(row.on_time)}</TableCell>
                <TableCell className="text-right">{formatPercent(row.rework_rate)}</TableCell>
                <TableCell className="text-right">{row.accuracy === null ? "—" : twoDecimals(row.accuracy)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
