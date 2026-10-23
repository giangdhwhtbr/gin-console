import { Link2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const KINDS = {
  comments: { icon: MessageSquare, nouns: ["comment", "comments"], tone: "bg-muted font-semibold text-foreground" },
  dependencies: { icon: Link2, nouns: ["dependency", "dependencies"], tone: "text-muted-foreground" },
} as const;

export function CountBadge({ kind, count }: { kind: keyof typeof KINDS; count: number }) {
  if (count <= 0) return null;
  const { icon: Icon, nouns, tone } = KINDS[kind];
  return (
    <span
      role="img"
      aria-label={`${count} ${count === 1 ? nouns[0] : nouns[1]}`}
      className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs", tone)}
    >
      <Icon className="size-3.5" />
      {count}
    </span>
  );
}
