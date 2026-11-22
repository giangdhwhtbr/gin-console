import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead } from "./beadFixtures";
import { hasLanes, LANE, laneState, laneStep, laneSummary, lanesOf, type LaneBoard, type Point } from "./lanes";

const NOW = new Date("2026-11-20T10:00:00Z");
const E = "ex-e12";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const track = (n: number, lane: string | null, over: Partial<BeadSummary> = {}) =>
  bead(`${E}.${n}`, { parent: E, lane, track: { plan: "p/team.md", number: n }, ...over });
const gate = (id: string, n: number, target: string | null, lane: string | null, over: Partial<BeadSummary> = {}) =>
  bead(id, {
    title: `external: p/team.md#${n}`,
    parent: id === "ex-g3" ? null : E,
    waits_for: { plan: "p/team.md", number: n, track_id: target, lane },
    ...over,
  });

const t1 = track(1, "be", { status: "closed", assignee: "ann" });
const t2 = track(2, "be", {
  status: "in_progress",
  assignee: "ann",
  blocked_by: [t1.id],
  claim: { holder: "ann@example.com", expires_at: "2026-11-21T16:00:00Z" },
});
const t3 = track(3, "fe", { status: "closed", assignee: "bao" });
const g2 = gate(`${E}.9`, 2, t2.id, "be", { blocked: true });
const g3 = gate("ex-g3", 3, t3.id, "fe", { status: "closed" });
const t4 = track(4, "qa", { blocked: true, blocked_by: [g2.id, g3.id] });
const t5 = track(5, "infra", { status: "closed", assignee: "chi" });
const t6 = track(6, "infra", {
  assignee: "chi",
  blocked_by: [t5.id],
  ready: true,
  claim: { holder: "chi@example.com", expires_at: "2026-11-19T09:00:00Z" },
});
const t7 = track(7, null, { assignee: "dung" });
const t8 = track(8, null, { status: "closed", assignee: "dung" });
const epic = bead(E, { issue_type: "epic" });
const ALL = [epic, t1, t2, t3, g2, g3, t4, t5, t6, t7, t8];
const ids = (list: readonly BeadSummary[]) => new Set(list.map((b) => b.id));
const board = (beads = ALL, matched: ReadonlySet<string> = ids([t1, t2, t3, t4, t5, t6, t7, t8])) => lanesOf(beads, E, matched, NOW);
const row = (b: LaneBoard, lane: string | null) => b.rows.find((r) => r.lane === lane)!;
const card = (b: LaneBoard, id: string) => b.rows.flatMap((r) => r.cards).find((c) => c.bead.id === id)!;

type Rect = { x: number; y: number; w: number; h: number };
/** Does the segment a-b cross the inside of the rectangle (touching its border is allowed)? */
function crosses(a: Point, b: Point, r: Rect): boolean {
  const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x), y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
  return x1 < r.x + r.w && x2 > r.x && y1 < r.y + r.h && y2 > r.y;
}
const cardRects = (b: LaneBoard): Rect[] => b.rows.flatMap((r) => r.cards.map((c) => ({ x: c.x, y: c.y, w: LANE.cardW, h: LANE.cardH })));
const headerRects = (b: LaneBoard): Rect[] => b.rows.map((r) => ({ x: -240, y: r.top, w: 240, h: LANE.rowH }));
function expectClear(b: LaneBoard) {
  for (const arrow of b.arrows) {
    for (let i = 1; i < arrow.points.length; i += 1) {
      for (const rect of [...cardRects(b), ...headerRects(b)]) {
        expect(crosses(arrow.points[i - 1], arrow.points[i], rect), `${arrow.from}>${arrow.to} segment ${i}`).toBe(false);
      }
      const [p, q] = [arrow.points[i - 1], arrow.points[i]];
      expect(p.x === q.x || p.y === q.y).toBe(true);
    }
  }
}
const markerRect = (m: LaneBoard["markers"][number]): Rect => ({ x: m.x, y: m.y, w: m.w, h: 20 });

describe("hasLanes", () => {
  it("REQ-UI-111 Lanes tab: true when a track of the scope has a lane, false for no scope or no lanes", () => {
    expect(hasLanes(ALL, E)).toBe(true);
    expect(hasLanes(ALL, null)).toBe(false);
    expect(hasLanes([epic, bead("x", { parent: E })], E)).toBe(false);
    expect(hasLanes(ALL, "ex-other")).toBe(false);
  });
});

describe("lanesOf rows and columns", () => {
  it("REQ-UI-111 rows ordered by first column then name, with No lane last; gates are not cards", () => {
    const b = board();
    expect(b.rows.map((r) => r.lane)).toEqual(["be", "fe", "infra", "qa", null]);
    expect(b.rows.flatMap((r) => r.cards).map((c) => c.bead.id)).not.toContain(g2.id);
  });

  it("REQ-UI-111 columns: after blockers, after the gate's track, after the previous card of the row", () => {
    const b = board();
    expect([t1, t2, t3, t4, t5, t6, t7, t8].map((t) => card(b, t.id).column)).toEqual([0, 1, 0, 2, 0, 1, 0, 1]);
    expect(card(b, t2.id).x).toBe(LANE.padX + (LANE.cardW + LANE.gapX));
    expect(row(b, "qa").top).toBe(LANE.padY + 3 * (LANE.rowH + LANE.gapY));
    expect(card(b, t4.id).y).toBe(row(b, "qa").top + (LANE.rowH - LANE.cardH) / 2);
    expect(b.width).toBe(LANE.padX * 2 + 3 * LANE.cardW + 2 * LANE.gapX);
    expect(b.height).toBe(LANE.padY * 2 + 5 * LANE.rowH + 4 * LANE.gapY);
  });

  it("REQ-UI-111 a row's cards follow dependency order, then track number, then id", () => {
    const a = track(10, "x", { blocked_by: [`${E}.11`] });
    const c = track(11, "x");
    const d = track(12, "x");
    const b = lanesOf([epic, a, c, d], E, ids([a, c, d]), NOW);
    expect(row(b, "x").cards.map((k) => k.bead.id)).toEqual([c.id, d.id, a.id]);
    expect(row(b, "x").cards.map((k) => k.column)).toEqual([0, 1, 2]);
  });

  it("REQ-UI-111 closed cards are drawn, and a card is drawn only when it matches; a row with no card is left out", () => {
    const b = board(ALL, ids([t2, t7]));
    expect(b.rows.map((r) => r.lane)).toEqual(["be", null]);
    expect(row(b, "be").cards.map((c) => c.bead.id)).toEqual([t2.id]);
    expect(row(b, "be").tracks).toEqual({ closed: 1, total: 2 }); // whatever the filters
    expect(board(ALL, new Set()).rows).toEqual([]);
  });

  it("REQ-UI-111 No lane row exists only when a track has no lane", () => {
    expect(lanesOf([epic, t1], E, ids([t1]), NOW).rows.map((r) => r.lane)).toEqual(["be"]);
  });
});

describe("lane header facts and state", () => {
  it("REQ-UI-112 Running lane with a lease", () => {
    const r = row(board(), "be");
    expect(r.state).toEqual({ kind: "running", words: "Running" });
    expect(r.holders).toEqual(["ann"]);
    expect(r.lease?.text).toMatch(/^until 21 Nov, 16:00/);
    expect(r.lease?.expired).toBe(false);
    expect(r.tracks).toEqual({ closed: 1, total: 2 });
  });

  it("REQ-UI-112 Waiting for another lane: the closed gate is not named; Unclaimed", () => {
    const r = row(board(), "qa");
    expect(r.state).toEqual({ kind: "waiting", words: "Waiting for be" });
    expect(r.holders).toEqual([]);
    expect(r.lease).toBeNull();
    expect(r.tracks).toEqual({ closed: 0, total: 1 });
  });

  it("REQ-UI-112 Idle lane with an expired lease", () => {
    const r = row(board(), "infra");
    expect(r.state).toEqual({ kind: "idle", words: "Idle" });
    expect(r.holders).toEqual(["chi"]);
    expect(r.lease?.text).toMatch(/^expired 19 Nov, 09:00/);
    expect(r.lease?.expired).toBe(true);
  });

  it("REQ-UI-112 All tracks closed: no holders, no lease", () => {
    const r = row(board(), "fe");
    expect(r.state).toEqual({ kind: "closed", words: "All tracks closed" });
    expect(r.holders).toEqual([]);
    expect(r.lease).toBeNull();
    expect(r.tracks).toEqual({ closed: 1, total: 1 });
  });

  it("REQ-UI-112 the No lane row has no state, holder or lease", () => {
    const r = row(board(), null);
    expect(r.state).toBeNull();
    expect(r.holders).toEqual([]);
    expect(r.lease).toBeNull();
    expect(r.tracks).toEqual({ closed: 1, total: 2 });
  });

  it("REQ-UI-112 state counts every track whatever the filters", () => {
    expect(row(board(ALL, ids([t2])), "be").tracks).toEqual({ closed: 1, total: 2 });
    expect(row(board(ALL, ids([t4])), "qa").state?.kind).toBe("waiting");
  });

  const gatesNone = () => [];
  it("REQ-UI-112 Not started and Blocked", () => {
    const x1 = bead("x1");
    const x2 = bead("x2");
    expect(laneState([x1, x2], [x1, x2], gatesNone, NOW)).toEqual({ kind: "not_started", words: "Not started" });
    const y1 = bead("y1", { blocked: true, blocked_by: ["z"] });
    expect(laneState([y1], [y1], gatesNone, NOW)).toEqual({ kind: "blocked", words: "Blocked" });
  });

  it("REQ-UI-112 rules apply in order: closed, running, waiting, blocked, not started, idle", () => {
    const open = gate("g", 1, null, null);
    const gated = bead("a", { blocked: true, blocked_by: ["g"] });
    const gates = (id: string) => (id === "a" ? [open] : []);
    expect(laneState([gated], [gated], gates, NOW).kind).toBe("waiting"); // waiting beats blocked
    expect(laneState([gated], [gated], gates, NOW).words).toBe("Waiting for another lane");
    const running = bead("r", { status: "in_progress" });
    expect(laneState([gated, running], [gated, running], gates, NOW).kind).toBe("running"); // running beats waiting
    const leased = bead("l", { claim: { holder: "h", expires_at: "2026-11-20T11:00:00Z" } });
    expect(laneState([leased], [leased], gatesNone, NOW).kind).toBe("running");
    const done = bead("d", { status: "closed" });
    expect(laneState([done], [done], gatesNone, NOW).kind).toBe("closed"); // closed beats everything
    expect(laneState([done, leased], [done, leased], gatesNone, NOW).kind).toBe("running");
    expect(laneState([done, bead("o")], [done, bead("o")], gatesNone, NOW).kind).toBe("idle");
  });

  it("REQ-UI-112 waiting names each open gate's lane once, a closed gate not at all", () => {
    const g1 = gate("g1", 1, null, "be");
    const g2b = gate("g2", 2, null, "be");
    const g3b = gate("g3", 3, null, "fe");
    const g4 = gate("g4", 4, null, null);
    const done = gate("g5", 5, null, "zz", { status: "closed" });
    const a = bead("a");
    const state = laneState([a], [a], () => [g1, g2b, g3b, g4, done], NOW);
    expect(state.words).toBe("Waiting for be, fe, another lane");
  });

  it("REQ-UI-112 only the first open card decides waiting or blocked", () => {
    const first = bead("a1");
    const second = bead("a2", { blocked: true });
    expect(laneState([first, second], [first, second], () => [], NOW).kind).toBe("not_started");
  });
});

describe("arrows and markers", () => {
  it("REQ-UI-113 Waiting and merged: arrows from tracks 2 and 3 to track 4, markers, nothing crosses a card or header", () => {
    const b = board();
    const toT4 = b.arrows.filter((a) => a.to === t4.id);
    expect(toT4.map((a) => [a.from, a.gate?.id])).toEqual([[t2.id, g2.id], [t3.id, g3.id]]);
    expect(b.markers.map((m) => [m.words, m.to])).toEqual([["Waiting", t4.id], ["Merged", t4.id]]);
    expectClear(b);
  });

  it("REQ-UI-113 a marker is centred on its arrow's row-gap segment", () => {
    const b = board();
    const gapAbove = row(b, "qa").top - LANE.gapY / 2;
    for (const m of b.markers) {
      expect(m.w).toBe(84);
      expect(m.y + 10).toBe(gapAbove);
      const arrow = b.arrows.find((a) => a.gate?.id === m.gate.id)!;
      const at = { x: m.x + m.w / 2, y: m.y + 10 };
      const onArrow = arrow.points.slice(1).some((q, i) => {
        const p = arrow.points[i];
        return at.x >= Math.min(p.x, q.x) && at.x <= Math.max(p.x, q.x) && at.y >= Math.min(p.y, q.y) && at.y <= Math.max(p.y, q.y);
      });
      expect(onArrow).toBe(true);
    }
  });

  it("REQ-UI-113 Arrow inside a lane: a straight line from track 1 to track 2 without a marker", () => {
    const b = board();
    const a = b.arrows.find((x) => x.from === t1.id && x.to === t2.id)!;
    expect(a.gate).toBeNull();
    const c1 = card(b, t1.id);
    const c2 = card(b, t2.id);
    expect(a.points).toEqual([
      { x: c1.x + LANE.cardW, y: c1.y + LANE.cardH / 2 },
      { x: c2.x, y: c2.y + LANE.cardH / 2 },
    ]);
    expect(b.markers.some((m) => m.gate.id === t1.id)).toBe(false);
  });

  it("REQ-UI-113 a routed arrow runs through the column gap, the row gap above its target and the column gap before it", () => {
    const b = board();
    const a = b.arrows.find((x) => x.from === t3.id && x.to === t4.id)!;
    const c3 = card(b, t3.id);
    const c4 = card(b, t4.id);
    const out = c3.x + LANE.cardW + LANE.gapX / 2;
    const into = c4.x - LANE.gapX / 2;
    const over = row(b, "qa").top - LANE.gapY / 2;
    expect(a.points).toEqual([
      { x: c3.x + LANE.cardW, y: c3.y + 32 },
      { x: out, y: c3.y + 32 },
      { x: out, y: over },
      { x: into, y: over },
      { x: into, y: c4.y + 32 },
      { x: c4.x, y: c4.y + 32 },
    ]);
  });

  it("REQ-UI-113 Track not drawn: no arrow, the marker 'Waiting for track 7' above the card from its left edge", () => {
    const unknown = gate("ex-ext", 7, null, null, { parent: null });
    const t = track(4, "qa", { blocked_by: [unknown.id] });
    const b = lanesOf([epic, t, unknown], E, ids([t]), NOW);
    expect(b.arrows).toEqual([]);
    const c = card(b, t.id);
    expect(b.markers).toHaveLength(1);
    expect(b.markers[0]).toMatchObject({ words: "Waiting for track 7", x: c.x, w: 152, y: row(b, "qa").top - LANE.gapY / 2 - 10 });
    const closed = gate("ex-ext2", 7, null, null, { parent: null, status: "closed" });
    expect(lanesOf([epic, { ...t, blocked_by: [closed.id] }, closed], E, ids([t]), NOW).markers[0].words).toBe("Merged track 7");
  });

  it("REQ-UI-113 a gate whose track is filtered out is an unknown-track marker", () => {
    const b = board(ALL, ids([t4]));
    expect(b.arrows).toEqual([]);
    expect(b.markers.map((m) => m.words)).toEqual(["Waiting for track 2", "Merged track 3"]);
    const [first, second] = b.markers.map(markerRect);
    expect(first.x + first.w + 4 <= second.x || second.x + second.w + 4 <= first.x).toBe(true);
  });

  it("REQ-UI-113 markers in one gap never intersect, and no arrow segment enters a card or header on a larger board", () => {
    const lanes = ["a", "b", "c", "d", "e", "f"];
    const sources = lanes.map((l, i) => track(20 + i, l, { status: "closed" }));
    const gates = lanes.map((l, i) => gate(`g${i}`, 20 + i, sources[i].id, l));
    const waiter = track(40, "z", { blocked_by: gates.map((g) => g.id) });
    const tail = track(41, "z", { blocked_by: [sources[0].id, sources[5].id, waiter.id] });
    const beads = [epic, ...sources, ...gates, waiter, tail];
    const b = lanesOf(beads, E, ids([...sources, waiter, tail]), NOW);
    expect(b.markers).toHaveLength(6);
    const rects = b.markers.map(markerRect);
    rects.forEach((r, i) => rects.slice(i + 1).forEach((o) => expect(r.x < o.x + o.w && o.x < r.x + r.w && r.y < o.y + o.h && o.y < r.y + r.h).toBe(false)));
    expectClear(b);
    for (const m of b.markers) {
      for (const c of cardRects(b)) expect(m.x < c.x + c.w && c.x < m.x + m.w && m.y < c.y + c.h && c.y < m.y + 20).toBe(false);
      for (const h of headerRects(b)) expect(m.x < h.x + h.w && h.x < m.x + m.w && m.y < h.y + h.h && h.y < m.y + 20).toBe(false);
    }
    expect(b.width).toBeGreaterThanOrEqual(Math.max(...b.markers.map((m) => m.x + m.w)));
  });

  it("REQ-UI-113 markers keep clear of another arrow's turns", () => {
    const b = board(ALL, ids([t1, t2, t3, t4, t5, t6, t7, t8]));
    for (const m of b.markers) {
      const own = b.arrows.find((a) => a.gate?.id === m.gate.id)!;
      for (const a of b.arrows.filter((x) => x !== own)) {
        for (const p of a.points.slice(1, -1)) {
          if (own.points.slice(1).some((q, i) => p.x >= Math.min(own.points[i].x, q.x) && p.x <= Math.max(own.points[i].x, q.x) && p.y >= Math.min(own.points[i].y, q.y) && p.y <= Math.max(own.points[i].y, q.y))) continue;
          expect(p.x > m.x && p.x < m.x + m.w && p.y > m.y && p.y < m.y + 20).toBe(false);
        }
      }
    }
  });

  it("REQ-UI-113 an arrow skipping columns in one row, and one going up, stay in the gaps", () => {
    const a = track(1, "x");
    const mid = track(2, "x", { blocked_by: [a.id] });
    const far = track(3, "x", { blocked_by: [a.id, mid.id] });
    const up = track(4, "w", { blocked_by: [far.id] });
    const side = track(5, "v", { blocked_by: [up.id] });
    const b = lanesOf([epic, a, mid, far, up, side], E, ids([a, mid, far, up, side]), NOW);
    expect(b.arrows.length).toBeGreaterThanOrEqual(5);
    expectClear(b);
  });

  it("REQ-UI-113 a gate between neighbouring cards of one row keeps its marker on the arrow's spur", () => {
    const a = track(1, "x");
    const g = gate("gg", 1, a.id, "x");
    const next = track(2, "x", { blocked_by: [g.id] });
    const b = lanesOf([epic, a, g, next], E, ids([a, next]), NOW);
    expect(b.arrows).toHaveLength(1);
    expectClear(b);
    expect(b.markers[0].y + 10).toBe(row(b, "x").top - LANE.gapY / 2);
  });

  it("REQ-UI-111 cycle fallback: back edges are not drawn, the cycle is listed, cards never share a spot", () => {
    const a = track(1, "x", { blocked_by: [`${E}.2`] });
    const c = track(2, "x", { blocked_by: [a.id] });
    const b = lanesOf([epic, a, c], E, ids([a, c]), NOW);
    expect(b.cycle).toEqual([a.id, c.id]);
    const cols = row(b, "x").cards.map((k) => k.column);
    expect(new Set(cols).size).toBe(2);
    expect(b.arrows.length).toBeLessThanOrEqual(1);
    expectClear(b);
  });

  it("REQ-UI-111 no cycle in an ordinary board", () => {
    expect(board().cycle).toEqual([]);
  });
});

describe("laneStep", () => {
  const b = board();
  it("REQ-UI-114 left and right stay in the row and stop at its edges", () => {
    expect(laneStep(b, t1.id, "ArrowRight")).toBe(t2.id);
    expect(laneStep(b, t2.id, "ArrowLeft")).toBe(t1.id);
    expect(laneStep(b, t1.id, "ArrowLeft")).toBeNull();
    expect(laneStep(b, t2.id, "ArrowRight")).toBeNull();
  });
  it("REQ-UI-114 Moving between rows: down from track 2 goes to track 3, the only card of the row below", () => {
    expect(laneStep(b, t2.id, "ArrowDown")).toBe(t3.id);
    expect(laneStep(b, t3.id, "ArrowUp")).toBe(t1.id); // columns 0 and 1: nearest is 1? no: 0 vs 1 -> nearest of be row to column 0
  });
  it("REQ-UI-114 nearest column, the earlier on a tie, null at an edge", () => {
    expect(laneStep(b, t4.id, "ArrowUp")).toBe(t6.id); // column 2 is nearest to 1
    expect(laneStep(b, t6.id, "ArrowDown")).toBe(t4.id);
    expect(laneStep(b, t1.id, "ArrowUp")).toBeNull();
    expect(laneStep(b, t8.id, "ArrowDown")).toBeNull();
    expect(laneStep(b, "nope", "ArrowDown")).toBeNull();
    // tie: from column 1 to a row with cards at 0 and 2
    const p = track(1, "p");
    const q = track(2, "p", { blocked_by: [p.id] });
    const r = track(3, "p", { blocked_by: [q.id] });
    const s = track(4, "s", { blocked_by: [p.id] });
    const u = track(5, "u", { blocked_by: [s.id] });
    const small = lanesOf([epic, p, q, r, s, u], E, ids([p, q, r, s, u]), NOW);
    expect(small.rows.map((x) => x.lane)).toEqual(["p", "s", "u"]);
    expect(laneStep(small, q.id, "ArrowDown")).toBe(s.id);
  });
});

describe("laneSummary", () => {
  it("REQ-UI-114 Screen reader list: lanes with state, holder, lease and tracks, then merge gates", () => {
    const lines = laneSummary(board());
    expect(lines).toContain("be: Running, held by ann, lease until 21 Nov, 16:00, 1/2 closed");
    expect(lines).toContain("qa: Waiting for be, unclaimed, 0/1 closed");
    expect(lines).toContain("fe: All tracks closed, 1/1 closed");
    expect(lines).toContain("No lane: 1/2 closed");
    expect(lines).toContain("qa #4 waits for be #2: merge pending");
    expect(lines).toContain("qa #4 waits for fe #3: merged");
  });
  it("REQ-UI-114 a gate whose track is not drawn names the track", () => {
    expect(laneSummary(board(ALL, ids([t4])))).toContain("qa #4 waits for be #2: merge pending");
  });
});
