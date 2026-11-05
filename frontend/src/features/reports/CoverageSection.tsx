import type { ReactNode } from "react";
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { CopyCommand } from "@/features/milestones/CopyCommand";
import type { Coverage, ProjectError } from "./api";
import { beadPath, formatPercent } from "./format";

function Block({ id, title, count, empty, children }: { id: string; title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="flex items-center gap-2 font-semibold">
        {title}{" "}
        <Badge variant="secondary">{count}</Badge>
      </h2>
      {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
    </section>
  );
}

export function CoverageSection({ coverage, errors }: { coverage: Coverage; errors: ProjectError[] }) {
  const share = coverage.unassigned_share;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">These gaps leave beads out of the other tabs. Fix them in the project, then reload the report.</p>
      <Block id="coverage-not-collected" title="Not collected" count={coverage.not_collected.length} empty="Every closed bead has AI usage.">
        <p className="text-sm text-muted-foreground">Closed beads without AI usage. Run the command in the project to collect it.</p>
        <ul className="flex flex-col gap-2 text-sm">
          {coverage.not_collected.map((b) => (
            <li key={`${b.project}/${b.id}`} className="flex flex-wrap items-center gap-3">
              <Link to={beadPath(b.project, b.id)} className="font-mono underline">{b.id}</Link>
              <CopyCommand command={b.detail} />
            </li>
          ))}
        </ul>
      </Block>
      <Block id="coverage-unreadable" title="Unreadable usage" count={coverage.invalid.length} empty="Every AI usage record is readable.">
        <ul className="text-sm">
          {coverage.invalid.map((b) => (
            <li key={`${b.project}/${b.id}`}>{b.id} — {b.detail}</li>
          ))}
        </ul>
      </Block>
      <Block id="coverage-unpriced" title="Models without a price" count={coverage.unpriced.length} empty="Every model has a price.">
        <ul className="text-sm">
          {coverage.unpriced.map((m) => (
            <li key={m}><code className="font-mono">{m}</code> counts tokens but no cost.</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">Add them to <code>.agent-workflow/usage-prices.yaml</code>.</p>
      </Block>
      <Block id="coverage-logs" title="Incomplete logs" count={coverage.sources.length} empty="Every collected bead read its session logs fully.">
        <ul className="text-sm">
          {coverage.sources.map((s) => (
            <li key={`${s.project}/${s.id}`}>
              {s.id}
              {Object.entries(s.sources).filter(([, value]) => value !== "ok").map(([name, value]) => `, ${name}: ${value}`).join("")}
              {s.skipped_lines > 0 && `, skipped lines: ${s.skipped_lines}`}
            </li>
          ))}
        </ul>
      </Block>
      <Block id="coverage-failed" title="Projects that failed" count={errors.length} empty="Every project answered.">
        <ul className="text-sm">
          {errors.map((e) => (
            <li key={e.project}>{e.project}: {e.error}</li>
          ))}
        </ul>
      </Block>
      {share !== null && share > 0 && (
        <p className="text-sm">{formatPercent(share)} of tokens have no assignee and show under Unassigned.</p>
      )}
      <p className="text-sm text-muted-foreground">
        Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured.
      </p>
    </div>
  );
}
