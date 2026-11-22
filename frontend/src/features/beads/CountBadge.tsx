import { Link2, MessageSquare } from "lucide-react";
import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";
import { cn } from "@/lib/utils";

const KINDS = {
  comments: { icon: MessageSquare, nouns: ["comment", "comments"], tone: "text-muted-foreground" },
  dependencies: { icon: Link2, nouns: ["dependency", "dependencies"], tone: "text-muted-foreground" },
} as const;

export function CountBadge({ kind, count }: { kind: keyof typeof KINDS; count: number }) {
  if (count <= 0) return null;
  const { icon: Icon, nouns, tone } = KINDS[kind];
  return (
    <Hint text={DEFINITIONS[kind]}>
      <span
        role="img"
        aria-label={`${count} ${count === 1 ? nouns[0] : nouns[1]}`}
        className={cn("inline-flex items-center gap-1 text-xs", tone)}
      >
        <Icon className="size-3.5" />
        {count}
      </span>
    </Hint>
  );
}
