import { factDate } from "@/lib/dates";
import type { BeadSummary, Claim, TrackRef } from "./api";

/** Labels worth a chip: `lane:<x>` and `track:<n>` are dropped when the bead's own field shows them. */
export function visibleLabels(bead: Pick<BeadSummary, "labels" | "lane" | "track">): string[] {
  return bead.labels.filter(
    (l) => !(bead.lane !== null && l.startsWith("lane:")) && !(bead.track !== null && l.startsWith("track:")),
  );
}

/** "#2 2026-11-17-team-checkout.md", or "#3" without a plan. */
export function trackText(track: TrackRef): string {
  const file = track.plan?.split("/").pop();
  return file ? `#${track.number} ${file}` : `#${track.number}`;
}

/** The lease of a lane: the latest expiry among its claims. */
export function leaseOf(claims: readonly (Claim | null)[], now: Date): { text: string; expired: boolean } | null {
  let latest: string | null = null;
  for (const claim of claims) {
    if (claim !== null && (latest === null || new Date(claim.expires_at) > new Date(latest))) latest = claim.expires_at;
  }
  if (latest === null) return null;
  const expired = new Date(latest) <= now;
  return { text: `${expired ? "expired" : "until"} ${factDate(latest)}`, expired };
}
