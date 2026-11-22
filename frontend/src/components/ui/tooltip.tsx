import { Tooltip } from "@base-ui/react/tooltip";
import { useId, type ReactElement } from "react";
import { createPortal } from "react-dom";

/** REQ-UI-132: a one-sentence tooltip on hover and focus; the sentence is also the element's description. */
export function Hint({ text, children, delay = 300 }: { text: string; children: ReactElement; delay?: number }) {
  const id = useId();
  return (
    <>
      <Tooltip.Root>
        <Tooltip.Trigger render={children} delay={delay} aria-describedby={id} />
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={4} className="z-50">
            <Tooltip.Popup role="tooltip" className="max-w-72 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
              {text}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      {/* in the body, so that the description does not become part of the text of the row it describes */}
      {createPortal(
        <span id={id} hidden>
          {text}
        </span>,
        document.body,
      )}
    </>
  );
}
