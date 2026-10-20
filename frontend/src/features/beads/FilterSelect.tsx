export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  // keep a value that came from the URL selectable even when no loaded bead has it
  const shown =
    value !== "" && !options.some((o) => o.value === value) ? [...options, { value, label: value }] : options;
  return (
    <label className="flex items-center gap-1 text-sm">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border bg-background px-2 py-1"
      >
        <option value="">All</option>
        {shown.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
