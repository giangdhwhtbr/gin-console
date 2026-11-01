import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UsageSection as Usage } from "./api";
import { ChartBox, legendText } from "./ChartBox";
import { STAGES, present, stageColor } from "./colors";
import { beadPath, formatCost, formatPercent, formatTokens } from "./format";

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

export function UsageSection({ usage, project }: { usage: Usage; project: string }) {
  if (usage.members.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">AI usage</h2>
        <p className="text-muted-foreground">No data in this period</p>
      </section>
    );
  }
  const memberStages = present(STAGES, usage.members.flatMap((m) => Object.keys(m.stages)));
  const stageNames = present(STAGES, usage.stages.map((s) => s.stage));
  const total = usage.stages.reduce((sum, s) => sum + s.tokens, 0);
  const stageRow: Record<string, string | number> = { name: "stages" };
  for (const s of usage.stages) stageRow[s.stage] = s.tokens;
  const all = project === "all";

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">AI usage</h2>
      <h3 className="font-medium">Tokens by member and stage</h3>
      <ChartBox height={40 + 36 * usage.members.length}>
        <BarChart layout="vertical" data={usage.members.map((m) => ({ member: m.member, ...m.stages }))}>
          <CartesianGrid stroke="var(--color-border)" />
          <XAxis type="number" tickFormatter={formatTokens} tick={tick} />
          <YAxis type="category" dataKey="member" tick={tick} />
          <Tooltip contentStyle={tooltipStyle} />
          {memberStages.length >= 2 && <Legend formatter={legendText} />}
          {memberStages.map((stage, i) => (
            <Bar
              key={stage}
              dataKey={stage}
              stackId="s"
              fill={stageColor(stage)}
              stroke="var(--color-background)"
              strokeWidth={2}
              radius={i === memberStages.length - 1 ? [0, 4, 4, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartBox>
      <Table>
        {heads(["Member", "Closed", "Tokens", "Est. cost", "Tokens/bead", "Cache ratio"])}
        <TableBody>
          {usage.members.map((m) => (
            <TableRow key={m.member}>
              <TableCell>{m.member}</TableCell>
              <TableCell>{m.closed}</TableCell>
              <TableCell>{formatTokens(m.tokens)}</TableCell>
              <TableCell>{formatCost(m.cost)}</TableCell>
              <TableCell>{m.tokens_per_bead === null ? "—" : formatTokens(m.tokens_per_bead)}</TableCell>
              <TableCell>{formatPercent(m.cache_ratio)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h3 className="font-medium">Top epics</h3>
      <Table>
        {heads(all ? ["Epic", "Project", "Tokens", "Est. cost", "Children", "Budget"] : ["Epic", "Tokens", "Est. cost", "Children", "Budget"])}
        <TableBody>
          {usage.epics.map((e) => (
            <TableRow key={`${e.project}/${e.id}`}>
              <TableCell>
                <Link to={beadPath(e.project, e.id)} className="underline">
                  {e.id} — {e.title}
                </Link>
              </TableCell>
              {all && <TableCell>{e.project}</TableCell>}
              <TableCell>{formatTokens(e.tokens)}</TableCell>
              <TableCell>{formatCost(e.cost)}</TableCell>
              <TableCell>
                {e.closed_children}/{e.children}
              </TableCell>
              <TableCell>
                {e.budget && (
                  <Badge variant="outline">
                    {e.budget.status} {formatCost(e.budget.cost)} of ${e.budget.budget_usd}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h3 className="font-medium">Top beads</h3>
      <Table>
        {heads(["Bead", "Type", "Assignee", "Tokens", "Est. cost"])}
        <TableBody>
          {usage.beads.map((b) => (
            <TableRow key={`${b.project}/${b.id}`}>
              <TableCell>
                <Link to={beadPath(b.project, b.id)} className="underline">
                  {b.id} — {b.title}
                </Link>
              </TableCell>
              <TableCell>{b.issue_type}</TableCell>
              <TableCell>{b.assignee ?? "Unassigned"}</TableCell>
              <TableCell>{formatTokens(b.tokens)}</TableCell>
              <TableCell>{formatCost(b.cost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h3 className="font-medium">Stage share</h3>
      <ChartBox height={72}>
        <BarChart layout="vertical" stackOffset="expand" data={[stageRow]}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip contentStyle={tooltipStyle} />
          {stageNames.length >= 2 && <Legend formatter={legendText} />}
          {stageNames.map((stage) => (
            <Bar
              key={stage}
              dataKey={stage}
              stackId="s"
              fill={stageColor(stage)}
              stroke="var(--color-background)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartBox>
      <ul className="text-sm">
        {usage.stages.map((s) => (
          <li key={s.stage}>
            {s.stage} — {total === 0 ? 0 : Math.round((s.tokens / total) * 100)}% ({formatTokens(s.tokens)})
          </li>
        ))}
      </ul>

      <h3 className="font-medium">Models</h3>
      <Table>
        {heads(["Model", "Role", "Input", "Output", "Cache read", "Cache write", "Tokens", "Est. cost"])}
        <TableBody>
          {usage.models.map((m) => (
            <TableRow key={`${m.model}/${m.role}`}>
              <TableCell>{m.model}</TableCell>
              <TableCell>{m.role}</TableCell>
              <TableCell>{formatTokens(m.input)}</TableCell>
              <TableCell>{formatTokens(m.output)}</TableCell>
              <TableCell>{formatTokens(m.cache_read)}</TableCell>
              <TableCell>{formatTokens(m.cache_write)}</TableCell>
              <TableCell>{formatTokens(m.tokens)}</TableCell>
              <TableCell>{formatCost(m.cost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
