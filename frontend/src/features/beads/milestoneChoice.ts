import type { ProjectMilestones } from "./api";

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
