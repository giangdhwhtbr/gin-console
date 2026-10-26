import { Dialog } from "@base-ui/react/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { activeFilters } from "./Breadcrumb";
import type { BeadFilters, BeadOptions } from "./filters";

export function MobileFiltersSheet({
  filters,
  options,
  onChange,
  onClear,
}: {
  filters: BeadFilters;
  options: BeadOptions;
  onChange: (patch: Partial<BeadFilters>) => void;
  onClear: () => void;
}) {
  const activeCount = activeFilters(filters);

  const toggleArrayItem = (list: string[], item: string): string[] => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={activeCount > 0 ? `Filters ${activeCount}` : "Filters"}
        className="inline-flex items-center gap-1.5 rounded border bg-background px-3 py-1 text-sm font-medium hover:bg-muted cursor-pointer transition-colors"
      >
        <SlidersHorizontal className="h-4 w-4 opacity-70" aria-hidden="true" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
            {activeCount}
          </span>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-xl border-t bg-background p-4 shadow-xl overflow-y-auto outline-none">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <Dialog.Title className="text-base font-semibold">Filter Beads</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 text-sm">
            {/* Status */}
            <div>
              <div className="font-medium text-xs text-muted-foreground uppercase mb-2">Status</div>
              <div className="flex flex-wrap gap-1.5">
                {options.statuses.map((status) => {
                  const selected = filters.status.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ status: toggleArrayItem(filters.status, status) })}
                      className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="font-medium text-xs text-muted-foreground uppercase mb-2">Priority</div>
              <div className="flex flex-wrap gap-1.5">
                {options.priorities.map((p) => {
                  const strP = String(p);
                  const selected = filters.priority.includes(strP);
                  return (
                    <button
                      key={strP}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ priority: toggleArrayItem(filters.priority, strP) })}
                      className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      P{p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Labels */}
            {options.labels.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-xs text-muted-foreground uppercase">Labels</div>
                  <div className="inline-flex rounded border bg-muted p-0.5 text-xs">
                    <button
                      type="button"
                      aria-pressed={filters.labelMode === "any"}
                      onClick={() => onChange({ labelMode: "any" })}
                      className={`rounded px-1.5 py-0.5 cursor-pointer font-medium ${
                        filters.labelMode === "any"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground"
                      }`}
                    >
                      Any
                    </button>
                    <button
                      type="button"
                      aria-pressed={filters.labelMode === "all"}
                      onClick={() => onChange({ labelMode: "all" })}
                      className={`rounded px-1.5 py-0.5 cursor-pointer font-medium ${
                        filters.labelMode === "all"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground"
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {options.labels.map((lbl) => {
                    const selected = filters.label.includes(lbl);
                    return (
                      <button
                        key={lbl}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange({ label: toggleArrayItem(filters.label, lbl) })}
                        className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assignee */}
            <div>
              <div className="font-medium text-xs text-muted-foreground uppercase mb-2">Assignee</div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {options.assignees.map((assignee) => {
                  const selected = filters.assignee.includes(assignee);
                  const label = assignee === "unassigned" ? "Unassigned" : assignee;
                  return (
                    <button
                      key={assignee}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ assignee: toggleArrayItem(filters.assignee, assignee) })}
                      className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sprint (hidden if no sprints exist) */}
            {options.sprints.length > 0 && (
              <div>
                <div className="font-medium text-xs text-muted-foreground uppercase mb-2">Sprint</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    aria-pressed={filters.sprint === ""}
                    onClick={() => onChange({ sprint: "" })}
                    className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                      filters.sprint === ""
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    aria-pressed={filters.sprint === "none"}
                    onClick={() => onChange({ sprint: "none" })}
                    className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                      filters.sprint === "none"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    No sprint
                  </button>
                  {options.sprints.map((sprint) => (
                    <button
                      key={sprint}
                      type="button"
                      aria-pressed={filters.sprint === sprint}
                      onClick={() => onChange({ sprint })}
                      className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        filters.sprint === sprint
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {sprint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type */}
            {options.types.length > 0 && (
              <div>
                <div className="font-medium text-xs text-muted-foreground uppercase mb-2">Type</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    aria-pressed={filters.type === ""}
                    onClick={() => onChange({ type: "" })}
                    className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                      filters.type === ""
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    All
                  </button>
                  {options.types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={filters.type === type}
                      onClick={() => onChange({ type })}
                      className={`rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        filters.type === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show closed */}
            <div className="pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                <input
                  type="checkbox"
                  checked={filters.closed}
                  onChange={(event) => onChange({ closed: event.target.checked })}
                  className="rounded border"
                />
                Show closed
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={onClear}
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-2 hover:underline cursor-pointer"
            >
              Clear all
            </button>
            <Dialog.Close className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
              Done
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
