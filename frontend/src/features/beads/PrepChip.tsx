import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";

/** REQ-UI-140: the word "Prep" in muted text. */
export function PrepChip() {
  return (
    <Hint text={DEFINITIONS.prep}>
      <span className="text-xs text-muted-foreground">Prep</span>
    </Hint>
  );
}
