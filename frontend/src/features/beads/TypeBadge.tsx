import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  epic: "bg-type-epic/8 text-type-epic",
  bug: "bg-type-bug/8 text-type-bug",
  feature: "bg-type-feature/8 text-type-feature",
};

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span
      data-type={type}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONE[type] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {type}
    </span>
  );
}
