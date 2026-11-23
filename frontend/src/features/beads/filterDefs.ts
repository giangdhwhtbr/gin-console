import type { BeadFilters, BeadOptions } from "./filters";
import type { MilestoneInEffect } from "./milestoneChoice";

export type FilterKey = "milestone" | "status" | "assignee" | "priority" | "label" | "type" | "kind" | "capability" | "sprint";

/** What the page's milestone means for the filters (REQ-UI-143). */
export type FilterContext = {
  /** A milestone page's Beads tab or an epic page's tab fixes the milestone: no Milestone filter (REQ-UI-142). */
  fixedMilestone: boolean;
  /** The milestone in effect (REQ-UI-104). */
  milestone: MilestoneInEffect;
  /** The milestone in effect when the URL has no `milestone`: the current one, else `all`. */
  byDefault: MilestoneInEffect;
};

/** One filter of the bead filter bar, its "More filters" and its sheet (REQ-UI-142 to REQ-UI-145, REQ-UI-084). */
export type FilterDef = {
  key: FilterKey;
  /** Its name on the button, the chip, the popover section and the sheet. */
  label: string;
  place: "bar" | "more";
  /** REQ-UI-143: the value differs from the default. */
  isActive: (filters: BeadFilters, context: FilterContext) => boolean;
  /** The default value, which "Clear filters" writes back. */
  clear: Partial<BeadFilters>;
  /** Offered in "More filters" and the sheet only while the loaded beads give a choice (REQ-UI-145). */
  offered: (options: BeadOptions) => boolean;
};

const always = () => true;

export const FILTER_DEFS: readonly FilterDef[] = [
  { key: "milestone", label: "Milestone", place: "bar", isActive: (_filters, c) => !c.fixedMilestone && c.milestone !== c.byDefault, clear: { milestone: "" }, offered: always },
  { key: "status", label: "Status", place: "bar", isActive: (f) => f.status.length > 0, clear: { status: [] }, offered: always },
  { key: "assignee", label: "Assignee", place: "bar", isActive: (f) => f.assignee.length > 0, clear: { assignee: [] }, offered: always },
  { key: "priority", label: "Priority", place: "more", isActive: (f) => f.priority.length > 0, clear: { priority: [] }, offered: always },
  { key: "label", label: "Labels", place: "more", isActive: (f) => f.label.length > 0, clear: { label: [], labelMode: "any" }, offered: always },
  { key: "type", label: "Type", place: "more", isActive: (f) => f.type !== "", clear: { type: "" }, offered: always },
  { key: "kind", label: "Kind", place: "more", isActive: (f) => f.kind !== "", clear: { kind: "" }, offered: always },
  { key: "capability", label: "Capability", place: "more", isActive: (f) => f.capability.length > 0, clear: { capability: [] }, offered: (o) => o.capabilities.length > 0 },
  { key: "sprint", label: "Sprint", place: "more", isActive: (f) => f.sprint !== "", clear: { sprint: "" }, offered: (o) => o.sprints.length > 0 },
];

/** REQ-UI-143: the search and the active filters; "Clear filters" shows above 0, and "Filters" (REQ-UI-084) and the breadcrumb (REQ-UI-072) show the number. */
export function activeFilters(filters: BeadFilters, context: FilterContext): number {
  return (filters.q.trim() !== "" ? 1 : 0) + FILTER_DEFS.filter((def) => def.isActive(filters, context)).length;
}

/** REQ-UI-145: the active filters inside "More filters". */
export function moreCount(filters: BeadFilters, context: FilterContext, options: BeadOptions): number {
  return FILTER_DEFS.filter((def) => def.place === "more" && def.offered(options) && def.isActive(filters, context)).length;
}

/** REQ-UI-143: the search and every filter back to their default, so the current milestone is in effect again; Show closed, view, group, finished, selection and scope stay. */
export function clearFilters(filters: BeadFilters): BeadFilters {
  return FILTER_DEFS.reduce<BeadFilters>((next, def) => ({ ...next, ...def.clear }), { ...filters, q: "" });
}
