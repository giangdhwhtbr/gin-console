import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { navigate } from "@/app/route";
import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { field } from "@/lib/guards";
import type { Point, QualityRow, QualitySection as Quality } from "./api";
import { ChartBox } from "./ChartBox";
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

const table = (title: string, rows: QualityRow[], linkKeys: boolean) => (
  <>
    <h3 className="font-medium">{title}</h3>
    <Table>
      <TableHeader>
        <TableRow>
          {["Key", "Beads", "Reopens", "Bugs", "Review cycles", "Rejections", "Waivers", "Findings (C/I/M/S)", "Rework rate"].map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.project ?? ""}/${r.key}`}>
            <TableCell>
              {linkKeys && r.project !== null ? (
                <Link to={beadPath(r.project, r.key)} className="underline">
                  {r.key}
                  {r.title !== null && ` — ${r.title}`}
                </Link>
              ) : (
                r.key
              )}
            </TableCell>
            <TableCell>{r.beads}</TableCell>
            <TableCell>{r.reopens}</TableCell>
            <TableCell>{r.bugs}</TableCell>
            <TableCell>{r.review_cycles}</TableCell>
            <TableCell>{r.rejections}</TableCell>
            <TableCell>{r.waivers}</TableCell>
            <TableCell>
              {r.findings.critical}/{r.findings.important}/{r.findings.minor}/{r.findings.suggestion}
            </TableCell>
            <TableCell>{formatPercent(r.rework_rate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </>
);

export function QualitySection({ quality }: { quality: Quality }) {
  if (quality.points.length + quality.members.length + quality.epics.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Quality and rework</h2>
        <p className="text-muted-foreground">No data in this period</p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Quality and rework</h2>
      {table("By member", quality.members, false)}
      {table("By epic", quality.epics, true)}
      {quality.points.length > 0 && (
        <>
          <h3 className="font-medium">Tokens vs rework per bead</h3>
          <ChartBox height={280}>
            <ScatterChart>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis type="number" dataKey="tokens" name="Tokens" tickFormatter={formatTokens} tick={tick} />
              <YAxis type="number" dataKey="rework" name="Rework" allowDecimals={false} tick={tick} />
              <Tooltip contentStyle={tooltipStyle} content={<PointTip />} />
              <Scatter data={quality.points} fill="var(--series-1)" onClick={openPoint} isAnimationActive={false} />
            </ScatterChart>
          </ChartBox>
          <h3 className="font-medium">Beads by rework</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bead</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Rework</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...quality.points]
                .sort((a, b) => b.rework - a.rework || b.tokens - a.tokens)
                .map((p) => (
                  <TableRow key={`${p.project}/${p.id}`}>
                    <TableCell>
                      <Link to={beadPath(p.project, p.id)} className="underline">
                        {p.id} — {p.title}
                      </Link>
                    </TableCell>
                    <TableCell>{formatTokens(p.tokens)}</TableCell>
                    <TableCell>{p.rework}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </>
      )}
    </section>
  );
}
