import { MultiSelectPopover } from "./MultiSelectPopover";

export function LabelsPopover({
  values,
  options,
  mode,
  onValuesChange,
  onModeChange,
}: {
  values: string[];
  options: readonly { value: string; label: string }[];
  mode: "any" | "all";
  onValuesChange: (next: string[]) => void;
  onModeChange: (next: "any" | "all") => void;
}) {
  const header = (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground font-medium">Match:</span>
      <div className="inline-flex rounded border bg-muted p-0.5">
        <button
          type="button"
          onClick={() => onModeChange("any")}
          className={`rounded px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
            mode === "any"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Any
        </button>
        <button
          type="button"
          onClick={() => onModeChange("all")}
          className={`rounded px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
            mode === "all"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
      </div>
    </div>
  );

  return (
    <MultiSelectPopover
      label="Labels"
      values={values}
      options={options}
      onChange={onValuesChange}
      header={header}
    />
  );
}
