import type { BeadSummary } from "./api";
import { bead } from "./beadFixtures";

/** `ex-e12` with 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked), lanes be, fe, infra, qa and two merge gates; qa #4 waits for be #2 (pending) and fe #3 (merged). */
export const E = "ex-e12";
const track = (n: number, lane: string | null, over: Partial<BeadSummary> = {}) =>
  bead(`${E}.${n}`, { parent: E, lane, track: { plan: "p/team.md", number: n }, ...over });
const gate = (id: string, n: number, target: string, lane: string, over: Partial<BeadSummary> = {}) =>
  bead(id, { title: `external: p/team.md#${n}`, parent: E, waits_for: { plan: "p/team.md", number: n, track_id: target, lane }, ...over });

export const t1 = track(1, "be", { title: "Order API", status: "closed", assignee: "ann", points: 3 });
export const t2 = track(2, "be", {
  title: "Payment API",
  status: "in_progress",
  assignee: "ann",
  points: 5,
  blocked_by: [t1.id],
  claim: { holder: "ann@example.com", expires_at: "2026-11-21T16:00:00Z" },
});
export const t3 = track(3, "fe", { title: "Checkout page", status: "closed", assignee: "bao", points: 3 });
export const g2 = gate(`${E}.9`, 2, t2.id, "be", { blocked: true });
export const g3 = gate(`${E}.10`, 3, t3.id, "fe", { status: "closed" });
export const t4 = track(4, "qa", { title: "End-to-end checkout QA", blocked: true, points: 3, blocked_by: [g2.id, g3.id] });
export const t5 = track(5, "infra", { title: "Deploy pipeline", status: "closed", assignee: "chi", points: 2 });
export const t6 = track(6, "infra", {
  title: "Monitoring",
  assignee: "chi",
  points: 2,
  ready: true,
  blocked_by: [t5.id],
  claim: { holder: "chi@example.com", expires_at: "2026-11-19T09:00:00Z" },
});
export const t7 = track(7, null, { title: "Release notes", assignee: "dung", points: 1, ready: true });
export const t8 = track(8, null, { title: "Old checkout cleanup", status: "closed", assignee: "dung", points: 2 });
export const epic = bead(E, { issue_type: "epic", title: "Team checkout", milestone: "ex-m2", status: "in_progress", child_counts: { total: 8, closed: 4, prep_total: 0, prep_closed: 0 } });
export const TRACKS = [t1, t2, t3, t4, t5, t6, t7, t8];
export const E12 = [epic, ...TRACKS, g2, g3];
export const CHILDREN = E12.filter((b) => b.parent === E);
