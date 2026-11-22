import { createContext, useContext, type ReactNode } from "react";
import type { MilestoneStatus } from "./api";
import type { MilestonesState } from "./milestoneChoice";

const NONE: ReadonlyMap<string, MilestoneStatus> = new Map();
const Statuses = createContext(NONE);

/** The status of each milestone of a loaded answer; empty while it loads or after it failed (REQ-MILESTONE-UI-022). */
export function statusesOf(state: MilestonesState): ReadonlyMap<string, MilestoneStatus> {
  return state.status === "ok" ? new Map(state.data.milestones.map((m): [string, MilestoneStatus] => [m.id, m.status])) : NONE;
}

/** Gives the beads below it the milestone statuses of their project, so a milestone bead draws its status and not its bead state. */
export function MilestoneStatusProvider({ statuses, children }: { statuses: ReadonlyMap<string, MilestoneStatus>; children: ReactNode }) {
  return <Statuses.Provider value={statuses}>{children}</Statuses.Provider>;
}

export function useMilestoneStatus(id: string): MilestoneStatus | null {
  return useContext(Statuses).get(id) ?? null;
}
