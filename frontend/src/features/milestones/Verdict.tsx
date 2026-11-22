import { StateGlyph } from "@/components/StateGlyph";
import { Hint } from "@/components/ui/tooltip";
import type { Verdict as VerdictOf } from "./gantt";

/** REQ-MILESTONE-UI-024: the one warning of an epic row, in the warning colour; the tooltip lists every warning line (REQ-UI-132). */
export function Verdict({ verdict }: { verdict: VerdictOf }) {
  return (
    <Hint text={verdict.lines.join("\n")}>
      <span data-verdict tabIndex={0} className="inline-flex min-w-0 items-center gap-1 pl-[26px] text-xs text-state-blocked">
        <StateGlyph state={verdict.knot ? "blocked" : "deferred"} color="var(--state-blocked)" size={10} className="flex-none" />
        <span className="min-w-0 truncate">{verdict.text}</span>
        {verdict.more > 0 && <span className="flex-none">+{verdict.more}</span>}
      </span>
    </Hint>
  );
}
