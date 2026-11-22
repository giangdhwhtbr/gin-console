import { Popover } from "@base-ui/react/popover";
import { CountBadge } from "@/features/beads/CountBadge";
import { LaneChip } from "@/features/beads/LaneChip";
import { PrepChip } from "@/features/beads/PrepChip";
import { STATE_LABEL, type GraphState } from "@/features/beads/graph";
import { StateWord } from "@/features/beads/StateMark";
import { buttonVariants } from "@/components/ui/button";
import { SizeBadge } from "@/components/SizeBadge";
import { DEFINITIONS } from "@/lib/definitions";
import type { ReactNode } from "react";

const STATES: readonly { state: GraphState; text: string }[] = [
  { state: "ready", text: DEFINITIONS.ready },
  { state: "in_progress", text: DEFINITIONS.inProgress },
  { state: "blocked", text: DEFINITIONS.blocked },
  { state: "done", text: DEFINITIONS.done },
  { state: "deferred", text: DEFINITIONS.deferred },
];

function Entry({ mark, text }: { mark: ReactNode; text: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="flex">{mark}</dt>
      <dd className="text-xs text-muted-foreground">{text}</dd>
    </div>
  );
}

/** REQ-UI-133: every mark of the page with its sentence, for a phone or for a mark that takes no focus. */
export function Legend() {
  return (
    <Popover.Root>
      <Popover.Trigger className={buttonVariants({ variant: "outline", size: "sm" })}>Legend</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} className="z-50">
          <Popover.Popup
            aria-label="Legend"
            className="max-h-[70vh] w-96 min-w-52 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none"
          >
            <dl className="flex flex-col divide-y text-sm">
              {STATES.map(({ state, text }) => (
                <Entry key={state} mark={<StateWord state={state} words={STATE_LABEL[state]} />} text={text} />
              ))}
              <Entry mark={<SizeBadge points={5} />} text={DEFINITIONS.points} />
              <Entry mark={<SizeBadge points={null} estimateMinutes={1440} />} text={DEFINITIONS.size} />
              <Entry mark={<PrepChip />} text={DEFINITIONS.prep} />
              <Entry mark={<LaneChip lane="lane" />} text={DEFINITIONS.lane} />
              <Entry mark={<CountBadge kind="comments" count={2} />} text={DEFINITIONS.comments} />
              <Entry mark={<CountBadge kind="dependencies" count={2} />} text={DEFINITIONS.dependencies} />
              <Entry mark={<span className="font-medium">Progress</span>} text={DEFINITIONS.progress} />
            </dl>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
