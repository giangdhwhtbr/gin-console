import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type DetailTab = "details" | "discussion";

export function DetailTabs({
  tab,
  onChange,
  count,
  className,
}: {
  tab: DetailTab;
  onChange: (tab: DetailTab) => void;
  count: number;
  className?: string;
}) {
  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const other = event.currentTarget.parentElement?.querySelector<HTMLElement>('[role="tab"][aria-selected="false"]');
    onChange(tab === "details" ? "discussion" : "details");
    other?.focus();
  };
  const item = (value: DetailTab, label: string) => (
    <button
      type="button"
      role="tab"
      id={`tab-${value}`}
      aria-selected={tab === value}
      aria-controls={`panel-${value}`}
      tabIndex={tab === value ? 0 : -1}
      onClick={() => onChange(value)}
      onKeyDown={move}
      className={cn(
        "min-h-11 border-b-2 px-3 text-sm font-medium md:min-h-9",
        tab === value ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Bead sections" className={cn("flex gap-2 border-b", className)}>
      {item("details", "Details")}
      {item("discussion", `Discussion (${count})`)}
    </div>
  );
}
