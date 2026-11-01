import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DeliverySection as Delivery, TimeRow } from "./api";
import { ChartBox, legendText } from "./ChartBox";
import { TYPES, present, typeColor } from "./colors";
import { beadPath, formatDays } from "./format";

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

const timeTable = (title: string, rows: TimeRow[]) => (
  <>
    <h3 className="font-medium">{title}</h3>
    <Table>
      {heads(["Key", "Beads", "Cycle median", "Cycle p85", "Lead median", "Lead p85"])}
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell>{r.key}</TableCell>
            <TableCell>{r.cycle?.n ?? r.lead?.n ?? 0}</TableCell>
            <TableCell>{formatDays(r.cycle?.median ?? null)}</TableCell>
            <TableCell>{formatDays(r.cycle?.p85 ?? null)}</TableCell>
            <TableCell>{formatDays(r.lead?.median ?? null)}</TableCell>
            <TableCell>{formatDays(r.lead?.p85 ?? null)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </>
);

export function DeliverySection({ delivery }: { delivery: Delivery }) {
  const types = present(TYPES, delivery.weeks.flatMap((w) => Object.keys(w.counts)));
  if (!delivery.weeks.some((w) => Object.values(w.counts).some((n) => n > 0))) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Delivery flow</h2>
        <p className="text-muted-foreground">No data in this period</p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Delivery flow</h2>
      <h3 className="font-medium">Closed beads per week</h3>
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
      <Table>
        {heads(["Week", ...types])}
        <TableBody>
          {delivery.weeks.map((w) => (
            <TableRow key={w.week}>
              <TableCell>{w.week}</TableCell>
              {types.map((t) => (
                <TableCell key={t}>{w.counts[t] ?? 0}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {timeTable("Cycle and lead time by type", delivery.by_type)}
      {timeTable("Cycle and lead time by member", delivery.by_member)}

      <h3 className="font-medium">Work in progress</h3>
      <Table>
        {heads(["Member", "In progress"])}
        <TableBody>
          {delivery.wip.map((w) => (
            <TableRow key={w.member}>
              <TableCell>{w.member}</TableCell>
              <TableCell>{w.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <h3 className="font-medium">Oldest in progress</h3>
      <Table>
        {heads(["Bead", "Assignee", "Age"])}
        <TableBody>
          {delivery.oldest.map((b) => (
            <TableRow key={`${b.project}/${b.id}`}>
              <TableCell>
                <Link to={beadPath(b.project, b.id)} className="underline">
                  {b.id} — {b.title}
                </Link>
              </TableCell>
              <TableCell>{b.assignee ?? "Unassigned"}</TableCell>
              <TableCell>{formatDays(b.age_days)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {delivery.estimates.length > 0 && (
        <>
          <h3 className="font-medium">Estimate vs actual</h3>
          <Table>
            {heads(["Epic", "Estimate (days)", "Actual (working days)"])}
            <TableBody>
              {delivery.estimates.map((e) => (
                <TableRow key={`${e.project}/${e.id}`}>
                  <TableCell>
                    <Link to={beadPath(e.project, e.id)} className="underline">
                      {e.id} — {e.title}
                    </Link>
                  </TableCell>
                  <TableCell>{e.estimate_days}</TableCell>
                  <TableCell>{e.actual_days}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </section>
  );
}
