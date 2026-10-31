import { CalendarClock, Check, CircleDot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const MARK = {
  planned: { icon: Clock, text: "text-state-deferred", label: "Planned" },
  scheduled: { icon: CalendarClock, text: "text-state-ready", label: "Scheduled" },
  active: { icon: CircleDot, text: "text-state-progress", label: "Active" },
  closed: { icon: Check, text: "text-state-done", label: "Closed" },
} as const;
const isKnown = (status: string): status is keyof typeof MARK => Object.hasOwn(MARK, status);

/** A milestone status as an icon and a word, never colour alone. */
export function MilestoneStatus({ status, className }: { status: string; className?: string }) {
  const mark = isKnown(status) ? MARK[status] : { icon: Clock, text: "text-muted-foreground", label: status };
  const Icon = mark.icon;
  return (
    <span data-status={status} className={cn("inline-flex items-center gap-1 text-sm font-medium", mark.text, className)}>
      <Icon aria-hidden className="size-3.5" />
      {mark.label}
    </span>
  );
}
