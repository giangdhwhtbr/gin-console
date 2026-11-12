import type { BeadStatus } from "../filters";
import type { TeamBead } from "../teamApi";

export type Column =
  | "bead"
  | "epic"
  | "type"
  | "assignee"
  | "priority"
  | "status"
  | "age"
  | "progress"
  | "closed"
  | "cycle"
  | "on_time"
  | "rework";
export type Dir = 1 | -1;

const BASE: Column[] = ["bead", "epic", "type", "assignee"];
export const COLUMNS: Record<BeadStatus, Column[]> = {
  open: [...BASE, "priority", "status", "age"],
  in_progress: [...BASE, "progress"],
  closed: [...BASE, "closed", "cycle", "on_time", "rework"],
  all: [...BASE, "status"],
};

export const DEFAULT_SORT: Record<BeadStatus, { column: Column; dir: Dir }> = {
  open: { column: "priority", dir: 1 },
  in_progress: { column: "progress", dir: -1 },
  closed: { column: "closed", dir: -1 },
  all: { column: "status", dir: 1 },
};

const DAY_MS = 86_400_000;

/** Days from the bead's creation to `today` (an ISO date). */
export const ageOf = (bead: TeamBead, today: string): number => Math.max(0, (Date.parse(today) - Date.parse(bead.created_at)) / DAY_MS);

type Key = string | number | null;

function keyOf(bead: TeamBead, column: Column, today: string): Key {
  switch (column) {
    case "bead":
      return bead.id;
    case "epic":
      return bead.epic.title;
    case "type":
      return bead.issue_type;
    case "assignee":
      return bead.assignee;
    case "priority":
      return bead.priority;
    case "status":
      return bead.status;
    // Age sorts like the creation date: ascending lists the oldest first, descending ends with the oldest.
    case "age":
      return -ageOf(bead, today);
    case "progress":
      return bead.age_days;
    case "closed":
      return bead.closed_at;
    case "cycle":
      return bead.cycle_days;
    case "on_time":
      return bead.late_days ?? 0;
    case "rework":
      return bead.rework;
  }
}

const compareKeys = (a: NonNullable<Key>, b: NonNullable<Key>): number =>
  typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));

/** A stable sort; beads without a value come last in both directions, and open beads that tie come oldest first. */
export function sortBeads(beads: TeamBead[], column: Column, dir: Dir, today: string): TeamBead[] {
  return [...beads].sort((a, b) => {
    const ka = keyOf(a, column, today);
    const kb = keyOf(b, column, today);
    if (ka === null || kb === null) return ka === kb ? 0 : ka === null ? 1 : -1;
    const order = compareKeys(ka, kb) * dir;
    if (order !== 0) return order;
    return a.bucket === "open" && b.bucket === "open" ? a.created_at.localeCompare(b.created_at) : 0;
  });
}
