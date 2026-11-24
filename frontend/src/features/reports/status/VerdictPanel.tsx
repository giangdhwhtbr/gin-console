import { StateGlyph } from "@/components/StateGlyph";
import { cn } from "@/lib/utils";
import type { StatusVerdict } from "./verdict";

/**
 * REQ-REPORTS-028: the verdict panel with its state glyph, word and sentence.
 * "At risk", "Late" and "Finished <n> d late" use the warning colour; "At risk" and "Late" sit on a warning wash.
 */
export function VerdictPanel({ verdict }: { verdict: StatusVerdict }) {
  const warn = verdict.tone === "risk" || verdict.tone === "late";
  const wash = verdict.word === "At risk" || verdict.word === "Late";
  return (
    <div
      data-verdict-tone={verdict.tone}
      data-verdict-wash={wash ? "true" : undefined}
      className={cn(
        "flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border px-4 py-3",
        wash ? "border-state-blocked/30 bg-state-blocked/5" : "bg-card",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap",
          warn ? "text-state-blocked" : verdict.tone === "good" ? "text-state-done" : "text-muted-foreground",
        )}
      >
        <StateGlyph state={verdict.glyph} size={14} color={warn ? "var(--state-blocked)" : undefined} className="flex-none" />
        {verdict.word}
      </span>
      <p className="min-w-0 text-sm text-foreground">{verdict.sentence}</p>
    </div>
  );
}
