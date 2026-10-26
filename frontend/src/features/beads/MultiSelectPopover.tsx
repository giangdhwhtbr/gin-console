import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
import type React from "react";

export function MultiSelectPopover({
  label,
  values,
  options,
  onChange,
  header,
}: {
  label: string;
  values: string[];
  options: readonly { value: string; label: string }[];
  onChange: (next: string[]) => void;
  header?: React.ReactNode;
}) {
  const count = values.length;
  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={count > 0 ? `${label} ${count}` : label}
        className="inline-flex items-center gap-1.5 rounded border bg-background px-2.5 py-1 text-sm font-medium hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
      >
        <span>{label}</span>
        {count > 0 && (
          <span className="rounded bg-primary/15 px-1.5 py-0.2 text-xs font-semibold text-primary">
            {count}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} className="z-50">
          <Popover.Popup className="min-w-48 max-w-72 rounded-md border bg-popover p-2 text-popover-foreground shadow-md outline-none">
            {header && <div className="mb-2 pb-2 border-b">{header}</div>}
            <div className="flex items-center justify-between gap-2 border-b pb-1.5 mb-1.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={selectAll}
                className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {options.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">No options available</div>
              ) : (
                options.map((opt) => {
                  const checked = values.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt.value)}
                        className="rounded border"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
