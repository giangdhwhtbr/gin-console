import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Budget, UsageSection as Usage } from "./api";
import { BarRows } from "./BarRows";
import { STAGES, present, stageColor } from "./colors";
import { beadPath, formatCost, formatPercent, formatTokens } from "./format";

const heads = (names: string[]) => (
  <TableHeader>
    <TableRow>
      {names.map((name) => (
        <TableHead key={name}>{name}</TableHead>
      ))}
    </TableRow>
  </TableHeader>
);

function BudgetCell({ budget }: { budget: Budget | null }) {
  if (budget === null || budget.budget_usd <= 0) return <span className="text-muted-foreground">No budget</span>;
  if (budget.cost === null) return <span className="text-muted-foreground">no price</span>;
  const percent = Math.round((budget.cost / budget.budget_usd) * 100);
  const over = percent > 100;
  return (
    <span className="flex items-center gap-2">
      <span
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={Math.max(100, percent)}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% of $${budget.budget_usd}`}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
      >
        <span className={cn("block h-full", over && "bg-state-blocked")} style={{ width: `${Math.min(percent, 100)}%`, background: over ? undefined : "var(--series-1)" }} />
      </span>
      <span className={cn("text-xs tabular-nums", over && "text-state-blocked")}>{percent}%</span>
    </span>
  );
}

export function UsageSection({ usage, project }: { usage: Usage; project: string }) {
  if (usage.members.length === 0) return <p className="text-muted-foreground">No data in this period</p>;
  const memberStages = present(STAGES, usage.members.flatMap((m) => Object.keys(m.stages)));
  const total = usage.stages.reduce((sum, s) => sum + s.tokens, 0);
  const share = usage.stages.map((s) => `${s.stage} ${total === 0 ? 0 : Math.round((s.tokens / total) * 100)}%`).join(", ");
  const all = project === "all";
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Tokens by member and stage</h2>
        <ul className="flex flex-wrap gap-3 text-xs">
          {memberStages.map((stage) => (
            <li key={stage} className="flex items-center gap-1">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: stageColor(stage) }} />
              {stage}
            </li>
          ))}
        </ul>
        <BarRows
          rows={usage.members.map((m) => ({
            key: m.member,
            segments: memberStages.map((stage) => ({ name: stage, value: m.stages[stage] ?? 0, color: stageColor(stage) })),
            total: formatTokens(m.tokens),
            detail: `${m.closed} beads closed, ${formatTokens(m.tokens)} tokens, ${formatCost(m.cost)} estimated, ${m.tokens_per_bead === null ? "—" : formatTokens(m.tokens_per_bead)} tokens per bead, ${formatPercent(m.cache_ratio)} cache reads`,
          }))}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Stage share</h2>
        <div role="img" aria-label={share} className="flex h-5 overflow-hidden rounded">
          {usage.stages.filter((s) => s.tokens > 0).map((s) => (
            <span key={s.stage} className="border-r-2 border-background last:border-r-0" style={{ flexGrow: s.tokens, background: stageColor(s.stage) }} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{share}</p>
      </section>
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-semibold">Top epics</h2>
          <Table>
            {heads(all ? ["Epic", "Project", "Tokens", "Budget", "Children"] : ["Epic", "Tokens", "Budget", "Children"])}
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
                  <TableCell>
                    <BudgetCell budget={e.budget} />
                  </TableCell>
                  <TableCell>
                    {e.closed_children}/{e.children}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-semibold">Models</h2>
          <Table>
            {heads(["Model", "Role", "Tokens", "Est. cost"])}
            <TableBody>
              {usage.models.map((m) => (
                <TableRow key={`${m.model}/${m.role}`}>
                  <TableCell className="font-mono">{m.model}</TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>{formatTokens(m.tokens)}</TableCell>
                  <TableCell>{formatCost(m.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Top beads</h2>
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
      </section>
    </div>
  );
}
