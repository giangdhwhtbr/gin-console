import type { BeadSummary } from "./api";

export const DONE_LIMIT = 20;
export const FINISHED_LIMIT = 7;

export type BoardColumnKey = "backlog" | "ready" | "in_progress" | "blocked" | "done";
export const BOARD_COLUMNS: readonly { key: BoardColumnKey; title: string }[] = [
  { key: "backlog", title: "Backlog" },
  { key: "ready", title: "Ready" },
  { key: "in_progress", title: "In Progress" },
  { key: "blocked", title: "Blocked" },
  { key: "done", title: "Done" },
];

export type FocusColumnKey = "in_flight" | "blocked" | "next_up";
export const FOCUS_COLUMNS: readonly { key: FocusColumnKey; title: string }[] = [
  { key: "in_flight", title: "In flight" },
  { key: "blocked", title: "Blocked" },
  { key: "next_up", title: "Next up" },
];

const time = (text: string) => Date.parse(text) || 0;
const byImportance = (a: BeadSummary, b: BeadSummary) =>
  a.priority - b.priority || time(b.updated_at) - time(a.updated_at);
const closingTime = (bead: BeadSummary) => time(bead.closed_at ?? bead.updated_at);

/** Closed beads, the most recently closed first (updated_at stands in for a missing closed_at). */
export function closedNewestFirst(beads: readonly BeadSummary[]): BeadSummary[] {
  return beads.filter((b) => b.status === "closed").sort((a, b) => closingTime(b) - closingTime(a));
}

const working = (bead: BeadSummary) => bead.status === "in_progress" || bead.status === "hooked";

export function boardColumn(bead: BeadSummary): BoardColumnKey | null {
  if (bead.status === "deferred") return "backlog";
  if (bead.ready) return "ready";
  if (working(bead)) return "in_progress";
  if (bead.blocked) return "blocked";
  if (bead.status === "closed") return "done";
  return null;
}

export function boardColumns(beads: readonly BeadSummary[]): Record<BoardColumnKey, BeadSummary[]> {
  const columns: Record<BoardColumnKey, BeadSummary[]> = {
    backlog: [],
    ready: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  for (const bead of beads) {
    const key = boardColumn(bead);
    if (key !== null) columns[key].push(bead);
  }
  for (const key of ["backlog", "ready", "in_progress", "blocked"] as const) columns[key].sort(byImportance);
  columns.done = closedNewestFirst(columns.done);
  return columns;
}

function focusColumn(bead: BeadSummary): FocusColumnKey | null {
  if (working(bead)) return "in_flight";
  if (bead.blocked) return "blocked";
  if (bead.ready && bead.priority <= 1) return "next_up";
  return null;
}

export function focusColumns(beads: readonly BeadSummary[]): Record<FocusColumnKey, BeadSummary[]> {
  const columns: Record<FocusColumnKey, BeadSummary[]> = { in_flight: [], blocked: [], next_up: [] };
  for (const bead of beads) {
    const key = focusColumn(bead);
    if (key !== null) columns[key].push(bead);
  }
  for (const list of Object.values(columns)) list.sort(byImportance);
  return columns;
}

export type FocusRow = { title: string | null; columns: Record<FocusColumnKey, BeadSummary[]> };

const assigneeOf = (bead: BeadSummary) => (bead.assignee ?? bead.owner ?? "").trim();
const hasWork = (columns: Record<FocusColumnKey, BeadSummary[]>) => Object.values(columns).some((l) => l.length > 0);

export function focusRows(beads: readonly BeadSummary[], group: "" | "assignee"): FocusRow[] {
  if (group === "") return [{ title: null, columns: focusColumns(beads) }];
  const names = [...new Set(beads.map(assigneeOf).filter((name) => name !== ""))].sort((a, b) => a.localeCompare(b));
  const rows: FocusRow[] = names.map((name) => ({
    title: name,
    columns: focusColumns(beads.filter((b) => assigneeOf(b) === name)),
  }));
  rows.push({ title: "No assignee", columns: focusColumns(beads.filter((b) => assigneeOf(b) === "")) });
  return rows.filter((row) => hasWork(row.columns));
}
