import type { BeadSummary, GateRef } from "./api";

/** REQ-UI-116: a placeholder bead for another plan's track, not work. */
export const isMergeGate = (bead: { waits_for?: GateRef | null }): boolean => bead.waits_for != null;

export function withoutMergeGates<T extends { waits_for?: GateRef | null }>(beads: readonly T[]): T[] {
  return beads.filter((b) => !isMergeGate(b));
}

/** The track a gate waits for, when it is among `beads`. */
export function gateTarget(gate: BeadSummary, beads: readonly BeadSummary[]): BeadSummary | null {
  const id = gate.waits_for?.track_id;
  if (id == null) return null;
  return beads.find((b) => b.id === id) ?? null;
}

/** "be #2" when the lane is known, else "track 7". */
export const gateWords = (gate: GateRef): string =>
  gate.lane !== null ? `${gate.lane} #${gate.number}` : `track ${gate.number}`;

export const gateState = (status: string): "Waiting" | "Merged" => (status === "closed" ? "Merged" : "Waiting");
