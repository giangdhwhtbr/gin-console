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
  rework: "Rework: closed beads that were reopened (Beads interaction log) or had a bug found later (discovered-from).",
  reopens: "Reopens: how many times closed beads were reopened, from the Beads interaction log.",
  bugsFound: "Bugs found later: bugs linked discovered-from to a closed bead, from Beads dependencies.",
  overviewMilestones: "Milestones: the open milestone of each project, an overdue one first, with its Reports status verdict.",
  overviewAging: "In progress too long: beads in progress for more working days since their start than the number in the heading. Blocked beads are listed under Blocked; prep tasks, milestones, merge gates and epics split into tracks are left out.",
  overviewGates: "Gates not met: epics in progress before requirement, plan or orchestration is approved, or with an unknown gate.",
  overviewWaivers: "Waivers: waived gates and reviews of epics in progress.",
  overviewUnassigned: "Unassigned ready: ready beads with no assignee; prep tasks, milestones, merge gates and epics split into tracks are left out.",
  overviewWorkload: "Work in progress: beads in progress and not blocked, per assignee; prep tasks, milestones, merge gates and epics split into tracks are left out.",
  bugsOpened: "Opened: bugs created in this scope, from every source. Bugs found later in Rework counts only the bugs linked discovered-from to a closed bead.",
  bugsClosed: "Closed: bugs closed in this scope, from every source. Bugs found later in Rework counts only the bugs linked discovered-from to a closed bead.",
  bugsOpenNow: "Open now: every open bug of the project, deferred ones included, whatever the scope.",
  bugsOldest: "Oldest open: days since the oldest open bug of the project was created, whatever the scope.",
  bugsMedian: "Median days to close: the median of the days from creation to close of the bugs closed in this scope.",
} as const;

export type DefinitionKey = keyof typeof DEFINITIONS;

/** A count's rule followed by the scope it counts in. */
export const countHint = (rule: DefinitionKey, scope: string): string => `${DEFINITIONS[rule]} Counted in ${scope}.`;
