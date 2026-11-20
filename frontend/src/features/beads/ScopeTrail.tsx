/** The trail of containers above a Graph or Lanes view; the last item is the current one and "" returns to the top item. */
export function ScopeTrail({
  label,
  top,
  rest,
  onScope,
}: {
  label: string;
  top: string;
  rest: readonly string[];
  onScope: (scope: string) => void;
}) {
  const items: (readonly [string, string])[] = [["", top], ...rest.map((id) => [id, id] as const)];
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2 text-sm">
      {items.map(([id, name], i) => (
        <span key={id} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>›</span>}
          <button
            type="button"
            aria-current={i === rest.length ? "location" : undefined}
            onClick={() => onScope(id)}
            className="font-mono underline underline-offset-2"
          >
            {name}
          </button>
        </span>
      ))}
    </nav>
  );
}
