const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const formatTokens = (n: number): string => compact.format(n);
export const formatCost = (cost: number | null): string => (cost === null ? "no price" : `$${cost.toFixed(2)}`);
export const formatPercent = (rate: number | null): string => (rate === null ? "—" : `${Math.round(rate * 100)}%`);
export const formatDays = (days: number | null): string => (days === null ? "—" : `${days.toFixed(1)} d`);
export const beadPath = (project: string, id: string): string =>
  `/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`;

/** Actual minus estimated working days, to one decimal: late above 0. */
export function estimateDiff(estimateDays: number, actualDays: number): { text: string; late: boolean } {
  const diff = Math.round((actualDays - estimateDays) * 10) / 10;
  if (diff === 0) return { text: "on estimate", late: false };
  return diff > 0 ? { text: `+${diff} d`, late: true } : { text: `−${-diff} d`, late: false };
}
