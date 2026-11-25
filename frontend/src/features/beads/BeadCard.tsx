import type { KeyboardEvent } from "react";
import { shortId } from "@/lib/shortId";
import { Link } from "@/app/Link";
import { PriorityPill } from "@/components/PriorityPill";
import { SizeBadge } from "@/components/SizeBadge";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { blockerSummary } from "./blockers";
import { AssigneeName } from "./AssigneeName";
import { CountBadge } from "./CountBadge";
import { KindBadge } from "./KindBadge";
import { LaneChip } from "./LaneChip";
import { StateMark } from "./StateMark";
import { TypeBadge } from "./TypeBadge";
import type { Choose } from "./useChoose";

/** What the cards of a Board or Focus view share to follow the click rule (REQ-UI-147). */
export type CardChoice = {
  /** The selected bead's id, `` for none. */
  selected: string;
  /** The one card in the tab order: the selected one when drawn, else the first. */
  tabStop: string;
  choose: Choose;
  /** Escape while a card is selected: clear the selection and focus that card. */
  onEscape: () => void;
};

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

export function BeadCard({
  project,
  bead,
  choice,
  known,
}: {
  project: string;
  bead: BeadSummary;
  choice: CardChoice;
  known?: ReadonlyMap<string, BeadSummary>;
}) {
  const blocker = bead.blocked ? blockerSummary(bead, known ?? new Map()) : null;
  const short = shortId(bead.id);
  const selected = choice.selected === bead.id;
  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key === "Escape" && choice.selected !== "" && event.target === event.currentTarget) {
      event.preventDefault();
      choice.onEscape();
    } else {
      choice.choose.onKey(event, bead.id);
    }
  };
  return (
    <li
      data-card
      data-id={bead.id}
      tabIndex={choice.tabStop === bead.id ? 0 : -1}
      aria-current={selected ? "true" : undefined}
      onClick={() => choice.choose.click(bead.id)}
      onKeyDown={onKeyDown}
      className={cn(
        "flex cursor-pointer flex-col gap-1.5 rounded border p-2.5 text-sm",
        selected ? "bg-identity-wash shadow-[inset_3px_0_0_var(--identity)]" : "bg-card hover:bg-muted/60",
      )}
    >
      <div className="flex items-center justify-between font-mono text-13 text-muted-foreground">
        <span title={bead.id} aria-hidden={short !== bead.id || undefined}>
          {short}
        </span>
        {short !== bead.id && <span className="sr-only">{bead.id}</span>}
        <PriorityPill priority={bead.priority} />
      </div>
      <span onClick={stop}>
        <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`} className="font-medium wrap-anywhere">
          {bead.title}
        </Link>
      </span>
      {blocker !== null && (
        <p className="m-0 text-xs text-muted-foreground wrap-anywhere">
          {`Blocked by ${blocker.label}`}
          {blocker.more > 0 && ` +${blocker.more}`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <StateMark bead={bead} />
        <TypeBadge type={bead.issue_type} />
        <KindBadge kind={bead.kind} />
        {bead.lane !== null && <LaneChip lane={bead.lane} />}
        <SizeBadge points={bead.points} estimateMinutes={bead.estimate_minutes} />
        <CountBadge kind="comments" count={bead.comment_count} />
        <CountBadge kind="dependencies" count={bead.dependency_count} />
        <AssigneeName assignee={bead.assignee} className="text-muted-foreground wrap-anywhere" />
      </div>
    </li>
  );
}
