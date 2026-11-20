import type { BeadSummary } from "./api";
import { bead } from "./beadFixtures";

/** An `ex-e12`-shaped epic: lanes be, fe, qa and No lane; an open gate on track 2 and a closed one on track 3 block track 4. */
export const E12 = "ex-e12";
const track = (n: number, lane: string | null, over: Partial<BeadSummary> = {}) =>
  bead(`${E12}.${n}`, { parent: E12, lane, track: { plan: "p/team.md", number: n }, ...over });
const gate = (id: string, n: number, target: string, lane: string, over: Partial<BeadSummary> = {}) =>
  bead(id, { title: `external: p/team.md#${n}`, parent: E12, waits_for: { plan: "p/team.md", number: n, track_id: target, lane }, ...over });

export const t1 = track(1, "be", { status: "closed", assignee: "ann" });
export const t2 = track(2, "be", { status: "in_progress", assignee: "ann", blocked_by: [t1.id], claim: { holder: "ann", expires_at: "2099-01-01T16:00:00Z" } });
export const t3 = track(3, "fe", { status: "closed", assignee: "bao" });
export const g2 = gate(`${E12}.9`, 2, t2.id, "be", { blocked: true });
export const g3 = gate(`${E12}.10`, 3, t3.id, "fe", { status: "closed" });
export const t4 = track(4, "qa", { blocked: true, blocked_by: [g2.id, g3.id] });
export const t7 = track(7, null, { assignee: "dung" });
export const epic = bead(E12, { issue_type: "epic", title: "Team checkout" });
export const tracks = [t1, t2, t3, t4, t7];
export const e12 = [epic, ...tracks, g2, g3];
