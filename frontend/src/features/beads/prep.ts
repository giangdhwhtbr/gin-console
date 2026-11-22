/** A prep task: labelled `prep` and not a track (no `track:` or `req:` label). */
export function isPrep(labels: readonly string[]): boolean {
  return labels.includes("prep") && !labels.some((l) => l.startsWith("track:") || l.startsWith("req:"));
}
