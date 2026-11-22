import type { BeadKind, BeadSummary } from "./api";
import { personOf } from "@/lib/people";
import { matchesMilestone, type MilestoneInEffect } from "./milestoneChoice";

export const VIEWS = ["list", "board", "focus", "graph", "lanes"] as const;
export type View = (typeof VIEWS)[number];

export type BeadFilters = {
  project: string;
  q: string;
  status: string[];
  priority: string[];
  label: string[];
  labelMode: "any" | "all";
  type: string;
  /** The kind of the bead or of its epic (REQ-UI-108); `` for any. */
  kind: "" | BeadKind;
  /** Capabilities of the bead or of its epic (REQ-UI-108). */
  capability: string[];
  closed: boolean;
  view: View;
  group: "" | "assignee";
  finished: boolean;
  assignee: string[];
  sprint: string;
  /** `all`, `none`, a milestone id, or `` for the project's current milestone (REQ-UI-104). */
  milestone: string;
  select: string;
  /** The Graph view's container bead (REQ-UI-106); `` when absent. */
  scope: string;
};

export const KIND_OPTIONS: readonly { value: BeadKind; label: string }[] = [
  { value: "capability", label: "Capability" },
  { value: "technical", label: "Technical" },
  { value: "parity", label: "Parity" },
];

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
    kind: KIND_OPTIONS.find((o) => o.value === p.get("kind"))?.value ?? "",
    capability: parseArray(p.get("capability")),
    closed: p.get("closed") === "1",
    view: VIEWS.find((view) => view === p.get("view")) ?? "list",
    group: p.get("group") === "assignee" ? "assignee" : "",
    finished: p.get("finished") === "1",
    assignee: parseArray(p.get("assignee")).flatMap((a) => (a === "me" || a === "unassigned" ? [a] : personOf(a) ?? [])),
    sprint: p.get("sprint") ?? "",
    milestone: p.get("milestone") ?? "",
    select: p.get("select") ?? "",
    scope: p.get("scope") ?? "",
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
  if (filters.kind !== "") p.set("kind", filters.kind);
  if (filters.capability.length > 0) p.set("capability", filters.capability.join(","));
  if (filters.closed) p.set("closed", "1");
  if (filters.view !== "list") p.set("view", filters.view);
  if (filters.group !== "") p.set("group", filters.group);
  if (filters.finished) p.set("finished", "1");
  if (filters.assignee.length > 0) p.set("assignee", filters.assignee.join(","));
  if (filters.sprint !== "") p.set("sprint", filters.sprint);
  if (filters.milestone !== "") p.set("milestone", filters.milestone);
  if (filters.select !== "") p.set("select", filters.select);
  if (filters.scope !== "") p.set("scope", filters.scope);
  const text = p.toString();
  return text === "" ? "" : `?${text}`;
}

/** The label of an Assignee option (REQ-UI-082). */
export const assigneeLabel = (value: string): string =>
  value === "me" ? "Me" : value === "unassigned" ? "Unassigned" : value;

/** Replaces `me` with the person of the email; with no email `me` stays and matches no bead (REQ-BEADS-024). */
export function resolveMe(filters: BeadFilters, email: string | null): BeadFilters {
  const me = personOf(email);
  if (me === null || !filters.assignee.includes("me")) return filters;
  return { ...filters, assignee: filters.assignee.map((a) => (a === "me" ? me : a)) };
}

/** The bead itself when it is an epic, else its nearest epic ancestor among `byId`; null when there is none. */
function nearestEpic(bead: BeadSummary, byId: ReadonlyMap<string, BeadSummary>): BeadSummary | null {
  const seen = new Set<string>();
  let current: BeadSummary | undefined = bead;
  while (current && !seen.has(current.id)) {
    if (current.issue_type === "epic") return current;
    seen.add(current.id);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return null;
}

export function filterBeads(
  beads: readonly BeadSummary[],
  filters: BeadFilters,
  milestone: MilestoneInEffect = "all",
): BeadSummary[] {
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

  const byId = new Map(beads.map((b) => [b.id, b]));

  return beads.filter((bead) => {
    if (!matchesMilestone(bead, milestone)) return false;
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

    // Kind and capability: the bead's own, or those of its nearest epic
    if (filters.kind !== "" || filters.capability.length > 0) {
      const owners = [bead, nearestEpic(bead, byId)];
      if (filters.kind !== "" && !owners.some((o) => o?.kind === filters.kind)) return false;
      if (
        filters.capability.length > 0 &&
        !owners.some((o) => o?.capabilities.some((c) => filters.capability.includes(c)))
      ) {
        return false;
      }
    }

    // Assignee filter: matches if bead matches ANY selected assignee
    if (filters.assignee.length > 0) {
      const assigned = personOf(bead.assignee);
      const match = filters.assignee.some((a) =>
        a === "me" ? false : a === "unassigned" ? assigned === null : assigned === personOf(a),
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

  const persons = beads.map((b) => personOf(b.assignee)).filter((a): a is string => a !== null);
  const hasUnassigned = beads.some((b) => personOf(b.assignee) === null);
  const assignees = ["me", ...(hasUnassigned ? ["unassigned"] : []), ...unique(persons, text)];

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
    capabilities: unique(beads.flatMap((b) => b.capabilities), text),
    types: unique(beads.map((b) => b.issue_type), text),
    assignees,
    sprints,
  };
}
