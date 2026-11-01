import { CopyCommand } from "@/features/milestones/CopyCommand";
import type { Coverage, ProjectError } from "./api";
import { formatPercent } from "./format";

export function CoverageSection({ coverage, errors }: { coverage: Coverage; errors: ProjectError[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Data coverage</h2>
      {coverage.not_collected.length > 0 && (
        <>
          <h3 className="font-medium">Not collected</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {coverage.not_collected.map((b) => (
              <li key={`${b.project}/${b.id}`} className="flex flex-col gap-1">
                <span>
                  {b.id} — {b.title}
                </span>
                <CopyCommand command={b.detail} />
              </li>
            ))}
          </ul>
        </>
      )}
      {coverage.invalid.length > 0 && (
        <>
          <h3 className="font-medium">Unreadable usage</h3>
          <ul className="text-sm">
            {coverage.invalid.map((b) => (
              <li key={`${b.project}/${b.id}`}>
                {b.id} — {b.detail}
              </li>
            ))}
          </ul>
        </>
      )}
      {coverage.unpriced.length > 0 && (
        <p className="text-sm">
          Models without a price: {coverage.unpriced.join(", ")}. Add them to <code>.agent-workflow/usage-prices.yaml</code>.
        </p>
      )}
      <p className="text-sm">Unassigned share of tokens: {formatPercent(coverage.unassigned_share)}</p>
      {coverage.sources.length > 0 && (
        <>
          <h3 className="font-medium">Log sources</h3>
          <ul className="text-sm">
            {coverage.sources.map((s) => (
              <li key={`${s.project}/${s.id}`}>
                {s.id}
                {Object.entries(s.sources)
                  .filter(([, value]) => value !== "ok")
                  .map(([name, value]) => `, ${name}: ${value}`)
                  .join("")}
                {s.skipped_lines > 0 && `, skipped lines: ${s.skipped_lines}`}
              </li>
            ))}
          </ul>
        </>
      )}
      {errors.length > 0 && (
        <>
          <h3 className="font-medium">Projects that failed</h3>
          <ul className="text-sm">
            {errors.map((e) => (
              <li key={e.project}>
                {e.project}: {e.error}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured.
      </p>
    </section>
  );
}
