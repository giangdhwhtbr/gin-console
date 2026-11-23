/** REQ-UI-084: the "Select all"/"Clear" row and the checkbox list of a multi-select filter. */
export function MultiSelectList({
  values,
  options,
  onChange,
}: {
  values: string[];
  options: readonly { value: string; label: string }[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 border-b pb-1.5 text-13 text-muted-foreground">
        <button type="button" onClick={() => onChange(options.map((o) => o.value))} className="cursor-pointer hover:text-foreground">
          Select all
        </button>
        <button type="button" onClick={() => onChange([])} className="cursor-pointer hover:text-foreground">
          Clear
        </button>
      </div>
      <div className="max-h-60 space-y-0.5 overflow-y-auto">
        {options.length === 0 ? (
          <div className="p-2 text-13 text-muted-foreground">No options available</div>
        ) : (
          options.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 text-13 hover:bg-muted">
              <input type="checkbox" checked={values.includes(opt.value)} onChange={() => toggle(opt.value)} className="rounded border" />
              <span className="truncate">{opt.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
