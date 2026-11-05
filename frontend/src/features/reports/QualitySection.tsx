import { CartesianGrid, Legend, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { navigate } from "@/app/route";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { field } from "@/lib/guards";
import type { Point, QualityRow, QualitySection as Quality } from "./api";
import { ChartBox, legendText } from "./ChartBox";
import { beadPath, formatPercent, formatTokens } from "./format";

const tick = { fill: "var(--color-muted-foreground)" };
const tooltipStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)" };

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;

function isPoint(value: unknown): value is Point {
  return isObject(value) && typeof field(value, "project") === "string" && typeof field(value, "id") === "string";
}

// Recharts passes the clicked point either as the datum itself or wrapped in `payload`
function openPoint(clicked: unknown) {
  const point = isPoint(clicked) || !isObject(clicked) ? clicked : field(clicked, "payload");
  if (isPoint(point)) navigate(beadPath(point.project, point.id));
}

function PointTip({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!isPoint(point)) return null;
  return (
    <div className="rounded border bg-popover p-2 text-xs text-popover-foreground">
      <div>
        {point.id} — {point.title}
      </div>
      <div>Tokens {formatTokens(point.tokens)}</div>
      <div>Rework {point.rework}</div>
    </div>
  );
}

export function QualitySection({ quality }: { quality: Quality }) {
  if (quality.points.length + quality.members.length === 0) return <p className="text-muted-foreground">No data in this period</p>;
  const sum = (pick: (r: QualityRow) => number) => quality.members.reduce((n, r) => n + pick(r), 0);
  const findings: [string, number][] = [
    ["Critical", sum((r) => r.findings.critical)],
    ["Important", sum((r) => r.findings.important)],
    ["Minor", sum((r) => r.findings.minor)],
    ["Suggestion", sum((r) => r.findings.suggestion)],
    ["Waivers", sum((r) => r.waivers)],
  ];
  return (
    <div className="flex flex-col gap-8">
      {quality.points.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Tokens and rework per bead</h2>
          <p className="text-sm text-muted-foreground">Rework counts reopens, bugs and rejections.</p>
          <ChartBox height={280}>
            <ScatterChart>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis type="number" dataKey="tokens" name="Tokens" tickFormatter={formatTokens} tick={tick} />
              <YAxis type="number" dataKey="rework" name="Rework" allowDecimals={false} tick={tick} />
              <Tooltip contentStyle={tooltipStyle} content={<PointTip />} />
              <Legend formatter={legendText} />
              <Scatter name="No rework" data={quality.points.filter((p) => p.rework === 0)} fill="var(--series-1)" onClick={openPoint} isAnimationActive={false} />
              <Scatter name="Some rework" data={quality.points.filter((p) => p.rework > 0)} fill="var(--series-2)" onClick={openPoint} isAnimationActive={false} />
            </ScatterChart>
          </ChartBox>
        </section>
      )}
      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-semibold">Rework by member</h2>
          <Table>
            <TableHeader>
              <TableRow>
                {["Member", "Reopens", "Bugs", "Review cycles per bead", "Rejections", "Rework rate"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {quality.members.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>{r.key}</TableCell>
                  <TableCell>{r.reopens}</TableCell>
                  <TableCell>{r.bugs}</TableCell>
                  <TableCell>{r.beads === 0 ? "—" : (r.review_cycles / r.beads).toFixed(1)}</TableCell>
                  <TableCell>{r.rejections}</TableCell>
                  <TableCell>{formatPercent(r.rework_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section aria-labelledby="review-findings" className="flex flex-col gap-3">
          <h2 id="review-findings" className="font-semibold">Review findings</h2>
          <dl className="divide-y text-sm">
            {findings.map(([label, value]) => (
              <div key={label} className="flex justify-between py-2">
                <dt>{label}</dt>
                <dd className="font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
