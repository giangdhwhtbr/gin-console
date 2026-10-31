import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type TabItem<T extends string> = { value: T; label: string };

/** A tab list: one tab stop, Left and Right move and select (wrapping); ids `tab-<value>` control `panel-<value>`. */
export function Tabs<T extends string>({
  tabs,
  tab,
  onChange,
  label,
  className,
}: {
  tabs: readonly TabItem<T>[];
  tab: T;
  onChange: (tab: T) => void;
  label: string;
  className?: string;
}) {
  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const at = tabs.findIndex((t) => t.value === tab);
    const next = tabs[(at + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].value;
    onChange(next);
    event.currentTarget.parentElement?.querySelector<HTMLElement>(`#tab-${next}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-2 border-b", className)}>
      {tabs.map(({ value, label: text }) => (
        <button
          key={value}
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
          {text}
        </button>
      ))}
    </div>
  );
}
