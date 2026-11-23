import { Popover } from "@base-ui/react/popover";
import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** REQ-UI-140: the count pill of a filter control ("More filters", "Filters"). */
export const COUNT_PILL = "rounded bg-identity-wash px-1.5 py-0.5 text-xs font-semibold text-identity";

/** REQ-UI-144: a bar filter. Without a value the button "<label>"; with one the chip "<label> <values> ×" in the identity style. */
export function FilterChip({
  label,
  values,
  loading = false,
  onRemove,
  children,
}: {
  label: string;
  /** The chosen values as the menu names them; none shows the button. */
  values: readonly string[];
  /** The choices are loading: the button reads "<label>…" (REQ-UI-104). */
  loading?: boolean;
  /** The "×": removes this filter's value only. */
  onRemove: () => void;
  /** The filter's menu. */
  children: ReactNode;
}) {
  const text = values.join(", ");
  const chosen = values.length > 0;
  const name = chosen ? `${label} ${text}` : loading ? `${label}…` : label;
  return (
    <span
      style={chosen ? { minWidth: `calc(${label.length}ch + 4rem)` } : undefined}
      className={cn("inline-flex h-8 min-w-0 shrink items-center rounded-md border text-13", chosen ? "border-identity/45 bg-identity-wash" : "shrink-0 bg-background")}
    >
      <Popover.Root>
        <Popover.Trigger
          aria-label={name}
          title={chosen ? name : undefined}
          className="inline-flex h-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className={cn("shrink-0", chosen && "font-normal text-muted-foreground")}>{chosen ? label : name}</span>
          {chosen ? <span className="min-w-0 truncate">{text}</span> : <ChevronDown aria-hidden className="size-3.5 shrink-0 opacity-60" />}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} align="start" className="z-50">
            <Popover.Popup aria-label={label} className="min-w-48 max-w-72 rounded-md border bg-popover p-2 text-popover-foreground shadow-md outline-none">
              {children}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {chosen && (
        <button type="button" aria-label={`Remove ${label} filter`} onClick={onRemove} className="mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-identity hover:bg-identity/10">
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </span>
  );
}
