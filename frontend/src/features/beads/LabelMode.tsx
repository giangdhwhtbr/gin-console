const button = (active: boolean) =>
  `cursor-pointer rounded px-2 py-0.5 text-xs font-medium transition-colors ${
    active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
  }`;

/** REQ-UI-085: the Any/All match mode of the label filter. */
export function LabelMode({ mode, onChange }: { mode: "any" | "all"; onChange: (next: "any" | "all") => void }) {
  return (
    <div className="mb-2 flex items-center justify-between border-b pb-2 text-xs">
      <span className="font-medium text-muted-foreground">Match:</span>
      <div className="inline-flex rounded border bg-muted p-0.5">
        <button type="button" aria-pressed={mode === "any"} onClick={() => onChange("any")} className={button(mode === "any")}>
          Any
        </button>
        <button type="button" aria-pressed={mode === "all"} onClick={() => onChange("all")} className={button(mode === "all")}>
          All
        </button>
      </div>
    </div>
  );
}
