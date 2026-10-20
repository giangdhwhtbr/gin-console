import type { BeadSummary } from "./api";

export type BeadFilters = {
  project: string;
  q: string;
  status: string;
  priority: string;
  label: string;
  type: string;
  closed: boolean;
};

export function parseFilters(search: string): BeadFilters {
  const p = new URLSearchParams(search);
  return {
    project: p.get("project") ?? "",
    q: p.get("q") ?? "",
    status: p.get("status") ?? "",
    priority: p.get("priority") ?? "",
    label: p.get("label") ?? "",
    type: p.get("type") ?? "",
    closed: p.get("closed") === "1",
  };
}

export function filtersToSearch(filters: BeadFilters): string {
  const p = new URLSearchParams();
  for (const key of ["project", "q", "status", "priority", "label", "type"] as const) {
    if (filters[key] !== "") p.set(key, filters[key]);
  }
  if (filters.closed) p.set("closed", "1");
  const text = p.toString();
  return text === "" ? "" : `?${text}`;
}

export function filterBeads(beads: readonly BeadSummary[], filters: BeadFilters): BeadSummary[] {
  const needle = filters.q.trim().toLowerCase();
  return beads.filter(
    (bead) =>
      (needle === "" ||
        bead.id.toLowerCase().includes(needle) ||
        bead.title.toLowerCase().includes(needle) ||
        bead.labels.some((label) => label.toLowerCase().includes(needle))) &&
      (filters.status === "" || bead.status === filters.status) &&
      (filters.priority === "" || String(bead.priority) === filters.priority) &&
      (filters.label === "" || bead.labels.includes(filters.label)) &&
      (filters.type === "" || bead.issue_type === filters.type) &&
      (filters.closed || bead.status !== "closed"), // a closed list may still be on screen while the next one loads
  );
}

export function sortBeads(beads: readonly BeadSummary[]): BeadSummary[] {
  return [...beads].sort(
    (a, b) => a.priority - b.priority || Date.parse(b.updated_at) - Date.parse(a.updated_at),
  );
}

export type BeadOptions = ReturnType<typeof optionsOf>;

export function optionsOf(beads: readonly BeadSummary[]) {
  const unique = <T,>(values: T[], compare: (a: T, b: T) => number) => [...new Set(values)].sort(compare);
  const text = (a: string, b: string) => a.localeCompare(b);
  return {
    statuses: unique(beads.map((b) => b.status), text),
    priorities: unique(beads.map((b) => b.priority), (a, b) => a - b),
    labels: unique(beads.flatMap((b) => b.labels), text),
    types: unique(beads.map((b) => b.issue_type), text),
  };
}
