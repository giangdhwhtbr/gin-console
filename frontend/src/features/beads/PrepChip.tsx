import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";

export function PrepChip() {
  return (
    <Hint text={DEFINITIONS.prep}>
      <Badge variant="outline">Prep</Badge>
    </Hint>
  );
}
