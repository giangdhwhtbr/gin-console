import type { BeadSummary } from "./api";

export const VIEWS = ["list", "board", "focus"] as const;
export type View = (typeof VIEWS)[number];

export type BeadFilters = {
  project: string;
  q: string;
  status: string;
  priority: string;
  label: string;
  type: string;
  closed: boolean;
  view: View;
  group: "" | "assignee";
  finished: boolean;
  assignee: string;
  sprint: string;
  lane: string;
  select: string;
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
    view: VIEWS.find((view) => view === p.get("view")) ?? "list",
    group: p.get("group") === "assignee" ? "assignee" : "",
    finished: p.get("finished") === "1",
    assignee: p.get("assignee") ?? "",
    sprint: p.get("sprint") ?? "",
    lane: p.get("lane") ?? "",
    select: p.get("select") ?? "",
  };
}

export function filtersToSearch(filters: BeadFilters): string {
  const p = new URLSearchParams();
  for (const key of ["project", "q", "status", "priority", "label", "type"] as const) {
    if (filters[key] !== "") p.set(key, filters[key]);
  }
  if (filters.closed) p.set("closed", "1");
  if (filters.view !== "list") p.set("view", filters.view);
  if (filters.group !== "") p.set("group", filters.group);
  if (filters.finished) p.set("finished", "1");
  if (filters.lane !== "") p.set("lane", filters.lane);
  if (filters.assignee !== "") p.set("assignee", filters.assignee);
  if (filters.sprint !== "") p.set("sprint", filters.sprint);
  if (filters.select !== "") p.set("select", filters.select);
  const text = p.toString();
  return text === "" ? "" : `?${text}`;
}

export function filterBeads(beads: readonly BeadSummary[], filters: BeadFilters): BeadSummary[] {
  const needle = filters.q.trim().toLowerCase();
  const sprintMap = new Map<string, string[]>();
  if (filters.sprint !== "") {
    const sprintRegex = /^sprint:(.+)$/;
    for (const bead of beads) {
      const sps: string[] = [];
      for (const label of bead.labels) {
        const match = sprintRegex.exec(label);
        if (match) sps.push(match[1]);
      }
      if (sps.length > 0) sprintMap.set(bead.id, sps);
    }
  }

  return beads.filter((bead) => {
    if (
      needle !== "" &&
      !bead.id.toLowerCase().includes(needle) &&
      !bead.title.toLowerCase().includes(needle) &&
      !bead.labels.some((label) => label.toLowerCase().includes(needle))
    ) {
      return false;
    }
    if (filters.status !== "" && bead.status !== filters.status) return false;
    if (filters.priority !== "" && String(bead.priority) !== filters.priority) return false;
    if (filters.label !== "" && !bead.labels.includes(filters.label)) return false;
    if (filters.type !== "" && bead.issue_type !== filters.type) return false;

    // Assignee filter
    if (filters.assignee !== "") {
      if (filters.assignee === "unassigned") {
        if (bead.assignee !== null && bead.assignee !== "") return false;
      } else if (bead.assignee !== filters.assignee) {
        return false;
      }
    }

    // Sprint filter
    if (filters.sprint !== "") {
      const hasDirectSprint = bead.labels.includes(`sprint:${filters.sprint}`);
      const hasParentSprint = Boolean(bead.parent && sprintMap.get(bead.parent)?.includes(filters.sprint));
      if (!hasDirectSprint && !hasParentSprint) return false;
    }

    // Closed filter: show closed if explicitly requested OR if filtering by sprint
    if (!filters.closed && filters.sprint === "" && bead.status === "closed") {
      return false;
    }

    return true;
  });
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

  const rawAssignees = beads
    .map((b) => b.assignee)
    .filter((a): a is string => typeof a === "string" && a !== "");
  const sortedAssignees = unique(rawAssignees, text);
  const hasUnassigned = beads.some((b) => !b.assignee);
  const assignees = hasUnassigned ? ["unassigned", ...sortedAssignees] : sortedAssignees;

  const sprintRegex = /^sprint:(.+)$/;
  const rawSprints: string[] = [];
  for (const bead of beads) {
    for (const label of bead.labels) {
      const match = sprintRegex.exec(label);
      if (match) rawSprints.push(match[1]);
    }
  }
  const sprints = unique(rawSprints, (a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return {
    statuses: unique(beads.map((b) => b.status), text),
    priorities: unique(beads.map((b) => b.priority), (a, b) => a - b),
    labels: unique(beads.flatMap((b) => b.labels), text),
    types: unique(beads.map((b) => b.issue_type), text),
    assignees,
    sprints,
  };
}
