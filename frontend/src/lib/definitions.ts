/** REQ-UI-132: one sentence for each mark and count; REQ-BEADS-021 and REQ-BEADS-022 give the rules they state. */
export const DEFINITIONS = {
  blocked: "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart.",
  done: "Done: the bead is closed.",
  inProgress: "In progress: status in progress and not blocked. Prep tasks are counted apart.",
  ready: "Ready: open, with no open blocker, and not a milestone. Prep tasks are counted apart.",
  deferred: "Deferred: status deferred, or open but neither ready nor blocked.",
  open: "Open: status open, not started yet. Prep tasks are counted apart.",
  progress: "Progress: closed tracks of all tracks of the bead, prep tasks counted apart, whatever the filters.",
  size: "Size: the estimate of the bead in days, shown when it has no points.",
  points: "Points: the story points of the bead.",
  prep: "Prep: a prep task, done before discuss. Prep tasks are counted apart from tracks.",
  lane: "Lane: the line of work a track belongs to; tracks of different lanes can run in parallel.",
  comments: "Comments: how many comments the bead has.",
  commitmentMet: "Commitment met: the share of the points committed at kick-off that were completed.",
  parallelLanes: "Parallel lanes: how many lines of work the forecast runs at the same time.",
  notEstimated: "Not estimated: open epics with no estimate in days.",
  daysPerPoint: "Days per point: working days spent per story point, measured on finished epics.",
  specApproved: "Spec approved: the spec of the epic is confirmed, so its tracks can start.",
  unassigned: "Unassigned: beads with no assignee.",
  dependencies: "Dependencies: how many beads this bead depends on.",
} as const;

export type DefinitionKey = keyof typeof DEFINITIONS;

/** A count's rule followed by the scope it counts in. */
export const countHint = (rule: DefinitionKey, scope: string): string => `${DEFINITIONS[rule]} Counted in ${scope}.`;
