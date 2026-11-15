export type ChildCounts = { tracks: number; closedTracks: number; prep: number; closedPrep: number };

/** A prep task: labelled `prep` and not a track (no `track:` or `req:` label). */
export function isPrep(labels: readonly string[]): boolean {
  return labels.includes("prep") && !labels.some((l) => l.startsWith("track:") || l.startsWith("req:"));
}

export function childCounts(children: readonly { labels: readonly string[]; status: string }[]): ChildCounts {
  const counts: ChildCounts = { tracks: 0, closedTracks: 0, prep: 0, closedPrep: 0 };
  for (const child of children) {
    const closed = child.status === "closed" ? 1 : 0;
    if (isPrep(child.labels)) {
      counts.prep += 1;
      counts.closedPrep += closed;
    } else {
      counts.tracks += 1;
      counts.closedTracks += closed;
    }
  }
  return counts;
}

export const prepLabel = (c: ChildCounts): string | null => (c.prep > 0 ? `Prep ${c.closedPrep}/${c.prep}` : null);
