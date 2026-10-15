export function ProgressBar({ label, percent }: { label: string; percent: number }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="h-2 w-40 overflow-hidden rounded bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="text-sm tabular-nums">{`${Math.round(percent)}%`}</span>
    </div>
  );
}
