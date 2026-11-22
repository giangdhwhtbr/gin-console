import { StateGlyph, type GlyphState } from "@/components/StateGlyph";
import { cn } from "@/lib/utils";

const MARK = {
  planned: { glyph: "deferred", text: "text-state-deferred", label: "Planned" },
  scheduled: { glyph: "ready", text: "text-state-ready", label: "Scheduled" },
  active: { glyph: "in_progress", text: "text-state-progress", label: "Active" },
  closed: { glyph: "done", text: "text-state-done", label: "Closed" },
} as const satisfies Record<string, { glyph: GlyphState; text: string; label: string }>;
const isKnown = (status: string): status is keyof typeof MARK => Object.hasOwn(MARK, status);

/** A milestone status as a glyph and a word, never colour alone. */
export function MilestoneStatus({ status, className }: { status: string; className?: string }) {
  const mark = isKnown(status) ? MARK[status] : { glyph: "deferred" as const, text: "text-muted-foreground", label: status };
  return (
    <span data-status={status} className={cn("inline-flex items-center gap-1 text-sm font-medium", mark.text, className)}>
      <StateGlyph state={mark.glyph} color={isKnown(status) ? undefined : "var(--muted-foreground)"} />
      {mark.label}
    </span>
  );
}
