import type { BeadSummary } from "./api";

export const VIEWS = ["list", "board", "focus"] as const;
export type View = (typeof VIEWS)[number];

export type BeadFilters = {
  project: string;
  q: string;
  status: string[];
  priority: string[];
  label: string[];
  labelMode: "any" | "all";
  type: string;
  closed: boolean;
  view: View;
  group: "" | "assignee";
  finished: boolean;
  assignee: string[];
  sprint: string;
  select: string;
};

const parseArray = (value: string | null): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
};

export function parseFilters(search: string): BeadFilters {
  const p = new URLSearchParams(search);
  return {
    project: p.get("project") ?? "",
    q: p.get("q") ?? "",
    status: parseArray(p.get("status")),
    priority: parseArray(p.get("priority")),
    label: parseArray(p.get("label")),
    labelMode: p.get("label_mode") === "all" ? "all" : "any",
    type: p.get("type") ?? "",
    closed: p.get("closed") === "1",
    view: VIEWS.find((view) => view === p.get("view")) ?? "list",
    group: p.get("group") === "assignee" ? "assignee" : "",
    finished: p.get("finished") === "1",
    assignee: parseArray(p.get("assignee")),
    sprint: p.get("sprint") ?? "",
    select: p.get("select") ?? "",
  };
}

export function filtersToSearch(filters: BeadFilters): string {
  const p = new URLSearchParams();
  if (filters.project !== "") p.set("project", filters.project);
  if (filters.q !== "") p.set("q", filters.q);
  if (filters.status.length > 0) p.set("status", filters.status.join(","));
  if (filters.priority.length > 0) p.set("priority", filters.priority.join(","));
  if (filters.label.length > 0) p.set("label", filters.label.join(","));
  if (filters.labelMode === "all") p.set("label_mode", "all");
  if (filters.type !== "") p.set("type", filters.type);
  if (filters.closed) p.set("closed", "1");
  if (filters.view !== "list") p.set("view", filters.view);
  if (filters.group !== "") p.set("group", filters.group);
  if (filters.finished) p.set("finished", "1");
  if (filters.assignee.length > 0) p.set("assignee", filters.assignee.join(","));
  if (filters.sprint !== "") p.set("sprint", filters.sprint);
  if (filters.select !== "") p.set("select", filters.select);
  const text = p.toString();
  return text === "" ? "" : `?${text}`;
}

export const effectiveAssignee = (bead: BeadSummary): string | null => {
  const val =
    bead.assignee && bead.assignee.trim() !== ""
      ? bead.assignee
      : bead.owner && bead.owner.trim() !== ""
        ? bead.owner
        : null;
  return val ? val.trim() : null;
};

export function filterBeads(beads: readonly BeadSummary[], filters: BeadFilters): BeadSummary[] {
  const needle = filters.q.trim().toLowerCase();
  const sprintMap = new Map<string, string[]>();
  const sprintRegex = /^sprint:(.+)$/;

  if (filters.sprint !== "") {
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
    if (filters.status.length > 0) {
      const match = filters.status.some((s) => {
        if (bead.status === s) return true;
        if (s === "ready" && bead.ready) return true;
        if (s === "blocked" && bead.blocked) return true;
        return false;
      });
      if (!match) return false;
    }
    if (filters.priority.length > 0 && !filters.priority.includes(String(bead.priority))) return false;

    // Label filter with Any / All matching
    if (filters.label.length > 0) {
      if (filters.labelMode === "all") {
        if (!filters.label.every((l) => bead.labels.includes(l))) return false;
      } else {
        if (!filters.label.some((l) => bead.labels.includes(l))) return false;
      }
    }

    if (filters.type !== "" && bead.issue_type !== filters.type) return false;

    // Assignee filter: matches if bead matches ANY selected assignee
    if (filters.assignee.length > 0) {
      const assigned = effectiveAssignee(bead);
      const match = filters.assignee.some((a) =>
        a === "unassigned" ? !assigned : assigned === a,
      );
      if (!match) return false;
    }

    // Sprint filter:
    if (filters.sprint === "none") {
      const hasDirectSprint = bead.labels.some((l) => sprintRegex.test(l));
      const hasParentSprint = Boolean(bead.parent && sprintMap.has(bead.parent));
      if (hasDirectSprint || hasParentSprint) return false;
    } else if (filters.sprint !== "") {
      const hasDirectSprint = bead.labels.includes(`sprint:${filters.sprint}`);
      const hasParentSprint = Boolean(bead.parent && sprintMap.get(bead.parent)?.includes(filters.sprint));
      if (!hasDirectSprint && !hasParentSprint) return false;
    }

    // Closed filter:
    // Show closed if filters.closed is true OR if filtering by a named sprint (not "none")
    const showClosedForSprint = filters.sprint !== "" && filters.sprint !== "none";
    if (!filters.closed && !showClosedForSprint && bead.status === "closed") {
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
    .map(effectiveAssignee)
    .filter((a): a is string => a !== null);
  const sortedAssignees = unique(rawAssignees, text);
  const hasUnassigned = beads.some((b) => !effectiveAssignee(b));
  const assignees = hasUnassigned ? ["unassigned", ...sortedAssignees] : sortedAssignees;

  const rawStatuses: string[] = [];
  for (const b of beads) {
    if (b.status) rawStatuses.push(b.status);
    if (b.ready) rawStatuses.push("ready");
    if (b.blocked) rawStatuses.push("blocked");
  }
  const statuses = unique(rawStatuses, text);

  const sprintRegex = /^sprint:(.+)$/;
  const rawSprints: string[] = [];
  const nonSprintLabels: string[] = [];
  for (const bead of beads) {
    for (const label of bead.labels) {
      const match = sprintRegex.exec(label);
      if (match) {
        rawSprints.push(match[1]);
      } else {
        nonSprintLabels.push(label);
      }
    }
  }
  const sprints = unique(rawSprints, (a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const labels = unique(nonSprintLabels, text);

  return {
    statuses,
    priorities: unique(beads.map((b) => b.priority), (a, b) => a - b),
    labels,
    types: unique(beads.map((b) => b.issue_type), text),
    assignees,
    sprints,
  };
}
