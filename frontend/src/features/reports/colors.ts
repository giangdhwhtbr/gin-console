export const TYPES = ["task", "feature", "bug", "epic", "chore", "decision"] as const;

const MUTED = "var(--color-muted-foreground)";

// color follows the entity in its fixed slot, never its rank in the data
const colorIn = (order: readonly string[], name: string): string => {
  const index = order.indexOf(name);
  return index === -1 ? MUTED : `var(--series-${index + 1})`;
};

export const typeColor = (type: string): string => colorIn(TYPES, type);

/** Names present in the data: the fixed order first, then any others in the order seen. */
export function present(order: readonly string[], seen: Iterable<string>): string[] {
  const set = new Set(seen);
  return [...order.filter((name) => set.has(name)), ...[...set].filter((name) => !order.includes(name))];
}

/** Velocity tab series: one color per series, never shared between its two charts. */
export const VELOCITY_COLORS = {
  committed: "var(--series-1)",
  completed: "var(--series-2)",
  daysPerPoint: "var(--series-3)",
  planned: "var(--series-4)",
} as const;

/** Bugs section series: opened is the alarming one, closed the done one. */
export const BUG_COLORS = { opened: "var(--color-destructive)", closed: "var(--color-state-done)" } as const;
