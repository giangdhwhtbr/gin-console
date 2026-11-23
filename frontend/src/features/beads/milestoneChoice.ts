import type { MilestoneOption, ProjectMilestones } from "./api";

export type MilestonesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; data: ProjectMilestones };
/** `all`, `none` (beads without a milestone) or a milestone id. */
export type MilestoneInEffect = string;

/** The milestone the page filters by: the URL choice, else the current milestone, else all. */
export function milestoneInEffect(urlValue: string, state: MilestonesState): MilestoneInEffect {
  if (urlValue === "all" || urlValue === "none") return urlValue;
  if (state.status !== "ok") return "all";
  const { milestones, current } = state.data;
  if (urlValue === "") return current ?? "all";
  return milestones.some((m) => m.id === urlValue) ? urlValue : "all";
}

export function isClosedMilestone(choice: MilestoneInEffect, state: MilestonesState): boolean {
  return state.status === "ok" && state.data.milestones.some((m) => m.id === choice && m.status === "closed");
}

export function matchesMilestone(bead: { milestone: string | null }, choice: MilestoneInEffect): boolean {
  if (choice === "all") return true;
  if (choice === "none") return bead.milestone === null;
  return bead.milestone === choice;
}

export type MilestoneGroup = { label: "Active" | "Planned" | "Closed"; items: MilestoneOption[] };

const byStart = (a: MilestoneOption, b: MilestoneOption) => (a.start ?? "").localeCompare(b.start ?? "");
const byLatestEnd = (a: MilestoneOption, b: MilestoneOption) => (b.end ?? "").localeCompare(a.end ?? "");

/** REQ-UI-104: Active, Planned (`scheduled` and `planned`, by start) and Closed (latest end first); empty groups are left out. */
export function milestoneGroups(milestones: readonly MilestoneOption[]): MilestoneGroup[] {
  const groups: MilestoneGroup[] = [
    { label: "Active", items: milestones.filter((m) => m.status === "active") },
    { label: "Planned", items: milestones.filter((m) => m.status === "scheduled" || m.status === "planned").sort(byStart) },
    { label: "Closed", items: milestones.filter((m) => m.status === "closed").sort(byLatestEnd) },
  ];
  return groups.filter((group) => group.items.length > 0);
}

/** REQ-UI-144: the value shown on the Milestone chip; null while "All" is in effect, which shows the button "Milestone". */
export function milestoneValue(choice: MilestoneInEffect, state: MilestonesState): string | null {
  if (choice === "all") return null;
  if (choice === "none") return "No milestone";
  const found = state.status === "ok" ? state.data.milestones.find((m) => m.id === choice) : undefined;
  return found?.title ?? choice;
}
