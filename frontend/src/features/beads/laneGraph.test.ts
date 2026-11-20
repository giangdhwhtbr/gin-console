import { describe, expect, it } from "vitest";
import { factDate } from "@/lib/dates";
import type { BeadSummary } from "./api";
import { bead } from "./beadFixtures";
import {
  LANE_CHIP,
  LANE_GRAPH,
  laneGraph,
  laneGraphChain,
  laneGraphLines,
  laneGraphStep,
  laneSlots,
  type LaneBoxLayout,
  type LaneGraphArrow,
  type LaneGraph,
} from "./laneGraph";
import { E12, epic, g2, g3, t1, t2, t3, t4, t7 } from "./laneFixtures";
import { LANE } from "./lanes";

const NOW = new Date("2026-11-20T10:00:00Z");
const track = (n: number, lane: string | null, over: Partial<BeadSummary> = {}) =>
  bead(`${E12}.${n}`, { parent: E12, lane, track: { plan: "p/team.md", number: n }, ...over });

const t5 = track(5, "infra", { status: "closed", assignee: "chi" });
const t6 = track(6, "infra", { assignee: "chi", blocked_by: [t5.id] });
const t8 = track(8, null, { status: "closed", assignee: "dung" });
const BEADS = [epic, t1, t2, t3, g2, g3, t4, t5, t6, t7, t8];
const ALL = new Set(BEADS.map((b) => b.id));

const graphOf = (beads: readonly BeadSummary[] = BEADS, matched: ReadonlySet<string> = ALL) => laneGraph(beads, E12, matched, NOW);
const boxOf = (g: LaneGraph, lane: string | null): LaneBoxLayout => {
  const box = g.boxes.find((b) => b.lane === lane);
  if (box === undefined) throw new Error(`no box ${String(lane)}`);
  return box;
};
const cardOf = (g: LaneGraph, id: string) => {
  const card = g.cards.find((c) => c.bead.id === id);
  if (card === undefined) throw new Error(`no card ${id}`);
  return card;
};
const arrowOf = (g: LaneGraph, from: string, to: string) => g.arrows.find((a) => a.from === from && a.to === to);

type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (r: Rect, p: Pt) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;

/** The points of an SVG path of `M`, `L` and `C` commands; a cubic is sampled 40 times, a line 40 times too. */
function sample(d: string): Pt[] {
  const tokens = d.match(/[MLC]|-?\d+(?:\.\d+)?/g) ?? [];
  const pts: Pt[] = [];
  let cmd = "";
  let at: Pt = { x: 0, y: 0 };
  for (let i = 0; i < tokens.length; ) {
    const t = tokens[i];
    if (t === "M" || t === "L" || t === "C") {
      cmd = t;
      i += 1;
      continue;
    }
    const n = cmd === "C" ? 6 : 2;
    const v = tokens.slice(i, i + n).map(Number);
    i += n;
    const end = { x: v[n - 2], y: v[n - 1] };
    if (cmd === "M") pts.push(end);
    else {
      for (let k = 1; k <= 40; k += 1) {
        const s = k / 40;
        if (cmd === "L") pts.push({ x: at.x + (end.x - at.x) * s, y: at.y + (end.y - at.y) * s });
        else {
          const u = 1 - s;
          const f = (a: number, b: number, c: number, e: number) => u ** 3 * a + 3 * u * u * s * b + 3 * u * s * s * c + s ** 3 * e;
          pts.push({ x: f(at.x, v[0], v[2], v[4]), y: f(at.y, v[1], v[3], v[5]) });
        }
      }
    }
    at = end;
  }
  return pts;
}

const cardRect = (c: { x: number; y: number }): Rect => ({ x: c.x, y: c.y, w: LANE.cardW, h: LANE.cardH });
const headRect = (b: LaneBoxLayout): Rect => ({ x: b.x + LANE_GRAPH.pad, y: b.y, w: b.w - 2 * LANE_GRAPH.pad, h: LANE_GRAPH.head });

/**
 * Arrowheads are not modelled by the layout: the check treats the end of an arrow and the 10px before it (to its left) as the
 * head, and keeps every chip off it.
 */
function expectClear(g: LaneGraph) {
  const rects = [...g.cards.map(cardRect), ...g.boxes.map(headRect)];
  for (const a of g.arrows) {
    for (const p of sample(a.d)) for (const r of rects) if (inside(r, p)) expect.fail(`${a.from}>${a.to} runs through a card or header at ${p.x},${p.y}`);
  }
  for (const c of g.chips) {
    const chip = { x: c.x, y: c.y, w: c.w, h: 20 };
    for (const r of rects) expect(overlap(chip, r), `chip ${c.words}`).toBe(false);
  }
  for (const a of g.arrows.filter((x) => x.toBox)) {
    const points = sample(a.d);
    const end = points[points.length - 1];
    for (const c of g.chips) {
      for (const head of [end, { x: end.x - 10, y: end.y }]) expect(inside({ x: c.x, y: c.y, w: c.w, h: 20 }, head), `chip ${c.words} over the end of ${a.from}>${a.to}`).toBe(false);
    }
  }
  for (const [i, a] of g.chips.entries()) {
    for (const b of g.chips.slice(i + 1)) expect(overlap({ x: a.x, y: a.y, w: a.w, h: 20 }, { x: b.x, y: b.y, w: b.w, h: 20 }), `${a.words} / ${b.words}`).toBe(false);
  }
}

function expectEndsOnBox(g: LaneGraph, from: string, to: string) {
  const arrow = arrowOf(g, from, to);
  const target = cardOf(g, to);
  const box = boxOf(g, target.lane);
  expect(arrow, `${from}>${to}`).toMatchObject({ toBox: true });
  expect(sample(arrow?.d ?? "").at(-1)).toEqual({ x: box.x, y: target.y + LANE.cardH / 2 });
}

/** Tiers are columns left to right, and the boxes of a tier stand one under another without touching. */
function expectColumns(g: LaneGraph) {
  const tiers = [...new Set(g.boxes.map((b) => b.tier))].sort((a, b) => a - b);
  let edge = -Infinity;
  for (const t of tiers) {
    const col = g.boxes.filter((b) => b.tier === t);
    expect(new Set(col.map((b) => b.x)).size, `tier ${t} shares one x`).toBe(1);
    expect(col[0].x, `tier ${t} is right of the earlier one`).toBeGreaterThanOrEqual(edge + LANE_GRAPH.tierGap);
    edge = Math.max(...col.map((b) => b.x + b.w));
    for (const [i, a] of col.entries()) for (const b of col.slice(i + 1)) expect(overlap(a, b), `${String(a.lane)} / ${String(b.lane)}`).toBe(false);
  }
}

/** A chip on an arrow between neighbouring tiers lies inside the gap between them. */
function expectChipsInGaps(g: LaneGraph) {
  const bottom = Math.max(...g.boxes.map((b) => b.y + b.h));
  for (const a of g.arrows.filter((x) => x.toBox && x.chip !== null)) {
    const chip = g.chips.find((c) => c.x === a.chip?.x && c.y === a.chip?.y);
    const from = boxOf(g, cardOf(g, a.from).lane);
    const to = boxOf(g, cardOf(g, a.to).lane);
    if (chip === undefined) throw new Error(`no chip for ${a.from}>${a.to}`);
    if (to.tier === from.tier + 1) {
      const left = Math.max(...g.boxes.filter((b) => b.tier === from.tier).map((b) => b.x + b.w));
      expect(chip.x, `${chip.words} left`).toBeGreaterThanOrEqual(left);
      expect(chip.x + chip.w, `${chip.words} right`).toBeLessThanOrEqual(to.x);
    } else {
      expect(chip.y, `${chip.words} in the channel`).toBeGreaterThanOrEqual(bottom);
    }
  }
}

describe("laneGraph", () => {
  // REQ-UI-117 scenario "Boxes in tiers"
  it("REQ-UI-117 Boxes in tiers: be, fe and infra stacked on the left, qa and No lane stacked to their right, and no gate node", () => {
    const g = graphOf();
    expect(g.boxes.map((b) => [b.lane, b.tier])).toEqual([["be", 0], ["fe", 0], ["infra", 0], ["qa", 1], [null, 1]]);
    const [be, fe, infra, qa, none] = ["be", "fe", "infra", "qa", null].map((l) => boxOf(g, l));
    const top = LANE_GRAPH.margin;
    expect([be.x, fe.x, infra.x]).toEqual([LANE_GRAPH.margin, LANE_GRAPH.margin, LANE_GRAPH.margin]);
    expect([be.y, fe.y, infra.y]).toEqual([top, top + be.h + LANE_GRAPH.boxGap, top + be.h + fe.h + 2 * LANE_GRAPH.boxGap]);
    const widest = Math.max(be.w, fe.w, infra.w);
    expect(qa.x).toBeGreaterThanOrEqual(LANE_GRAPH.margin + widest + LANE_GRAPH.tierGap);
    expect(none.x).toBe(qa.x);
    expect([qa.y, none.y]).toEqual([top, top + qa.h + LANE_GRAPH.boxGap]);
    expect(g.cards.some((c) => c.bead.waits_for !== null)).toBe(false);
    expect(g.cycle).toEqual([]);
    expectColumns(g);
  });

  it("REQ-UI-117 keeps boxes with no drawn card out and puts No lane in tier 0 when it is alone", () => {
    const g = graphOf(BEADS, new Set([t7.id]));
    expect(g.boxes.map((b) => [b.lane, b.tier])).toEqual([[null, 0]]);
    expect(laneGraph(BEADS, E12, new Set(), NOW)).toMatchObject({ boxes: [], cards: [], arrows: [], chips: [] });
  });

  // REQ-UI-117 scenario "Tracks left to right"
  it("REQ-UI-117 Tracks left to right: track 2 is right of track 1 in be with an arrow", () => {
    const g = graphOf();
    const c1 = cardOf(g, t1.id);
    const c2 = cardOf(g, t2.id);
    const be = boxOf(g, "be");
    expect([c1.layer, c2.layer]).toEqual([0, 1]);
    expect(c1.x).toBe(be.x + LANE_GRAPH.pad);
    expect(c2.x).toBe(be.x + LANE_GRAPH.pad + LANE.cardW + LANE_GRAPH.cardGap);
    expect(c1.y).toBe(be.y + LANE_GRAPH.head + LANE_GRAPH.pad);
    expect(be.w).toBe(2 * LANE_GRAPH.pad + 2 * LANE.cardW + LANE_GRAPH.cardGap);
    expect(be.h).toBe(LANE_GRAPH.head + 2 * LANE_GRAPH.pad + LANE.cardH);
    const arrow = arrowOf(g, t1.id, t2.id);
    expect(arrow).toMatchObject({ toBox: false, gate: null, dashed: false, chip: null });
    expect(arrow?.d).toBe(`M ${c1.x + LANE.cardW} ${c1.y + 32} L ${c2.x} ${c2.y + 32}`);
  });

  it("REQ-UI-117 stacks the cards of one layer one under another and routes around the cards", () => {
    const a = track(11, "x");
    const b = track(12, "x");
    const c = track(13, "x", { blocked_by: [a.id, b.id] });
    const d = track(14, "x", { blocked_by: [a.id] });
    const e = track(15, "x", { blocked_by: [c.id, d.id] });
    const beads = [epic, a, b, c, d, e];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    const box = boxOf(g, "x");
    expect([a, b].map((x) => [cardOf(g, x.id).layer, cardOf(g, x.id).stack])).toEqual([[0, 0], [0, 1]]);
    expect([c, d].map((x) => [cardOf(g, x.id).layer, cardOf(g, x.id).stack])).toEqual([[1, 0], [1, 1]]);
    expect(cardOf(g, b.id).y).toBe(cardOf(g, a.id).y + LANE.cardH + LANE_GRAPH.stackGap);
    expect(box.h).toBe(LANE_GRAPH.head + 2 * LANE_GRAPH.pad + 2 * LANE.cardH + LANE_GRAPH.stackGap);
    expect(box.w).toBe(2 * LANE_GRAPH.pad + 3 * LANE.cardW + 2 * LANE_GRAPH.cardGap);
    expect(g.arrows).toHaveLength(5);
    expectClear(g);
  });

  it("REQ-UI-117 an arrow that skips a layer runs through the gap under the cards", () => {
    const a = track(11, "x");
    const b = track(12, "x", { blocked_by: [a.id] });
    const c = track(13, "x", { blocked_by: [b.id, a.id] });
    const beads = [epic, a, b, c];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    const skip = arrowOf(g, a.id, c.id);
    const box = boxOf(g, "x");
    const ys = sample(skip?.d ?? "").map((p) => p.y);
    expect(Math.max(...ys)).toBeGreaterThan(cardOf(g, a.id).y + LANE.cardH);
    expect(Math.max(...ys)).toBeLessThan(box.y + box.h);
    expectClear(g);
  });

  // REQ-UI-117 scenario "Gate chips"
  it("REQ-UI-117 Gate chips: a dashed arrow with Waiting and a solid one with Merged to the qa box", () => {
    const g = graphOf();
    const waiting = arrowOf(g, t2.id, t4.id);
    const merged = arrowOf(g, t3.id, t4.id);
    expect(waiting).toMatchObject({ toBox: true, dashed: true });
    expect(waiting?.gate?.id).toBe(g2.id);
    expect(merged).toMatchObject({ toBox: true, dashed: false });
    expect(merged?.gate?.id).toBe(g3.id);
    expect(g.chips.map((c) => [c.kind, c.words, c.box]).sort()).toEqual([
      ["merged", "Merged · fe #3", null],
      ["waiting", "Waiting · be #2", null],
    ]);
    const chip = g.chips.find((c) => c.words === "Waiting · be #2");
    expect(waiting?.chip).toEqual({ x: chip?.x, y: chip?.y });
    expect(chip?.w).toBe(120);
    // the arrows start at the right edge of their card and end on the left edge of qa, level with the card of track 4
    const qa = boxOf(g, "qa");
    const c4 = cardOf(g, t4.id);
    expect(sample(waiting?.d ?? "")[0]).toEqual({ x: cardOf(g, t2.id).x + LANE.cardW, y: cardOf(g, t2.id).y + 32 });
    expect(sample(waiting?.d ?? "").at(-1)).toEqual({ x: qa.x, y: c4.y + 32 });
    expect(sample(merged?.d ?? "")[0]).toEqual({ x: cardOf(g, t3.id).x + LANE.cardW, y: cardOf(g, t3.id).y + 32 });
    expect(sample(merged?.d ?? "").at(-1)).toEqual({ x: qa.x, y: c4.y + 32 });
    expectChipsInGaps(g);
    expectClear(g);
  });

  // REQ-UI-117 scenario "Track not drawn"
  it("REQ-UI-117 Track not drawn: the chip sits on the top edge of the qa box and no arrow is drawn", () => {
    const far = bead(`${E12}.20`, {
      title: "external: .planning/plans/other.md#7",
      parent: E12,
      waits_for: { plan: ".planning/plans/other.md", number: 7, track_id: null, lane: null },
    });
    const closedFar = bead(`${E12}.21`, {
      title: "external: .planning/plans/other.md#8",
      parent: E12,
      status: "closed",
      waits_for: { plan: ".planning/plans/other.md", number: 8, track_id: null, lane: null },
    });
    const blocked = { ...t4, blocked_by: [g2.id, g3.id, far.id, closedFar.id] };
    const beads = [epic, t1, t2, t3, g2, g3, blocked, far, closedFar, t7];
    const g = graphOf(beads, new Set(beads.map((b) => b.id)));
    const qa = boxOf(g, "qa");
    const loose = g.chips.filter((c) => c.box === "qa");
    expect(loose.map((c) => [c.kind, c.words, c.w]).sort()).toEqual([
      ["merged", "Merged track 8", 152],
      ["waiting", "Waiting for track 7", 152],
    ]);
    for (const c of loose) expect(c.y + 20).toBe(qa.y); // sits on the top edge, outside the header
    expect(Math.min(...loose.map((c) => c.x))).toBeGreaterThanOrEqual(qa.x + LANE_GRAPH.pad);
    expect(g.arrows.filter((a) => a.gate?.id === far.id || a.gate?.id === closedFar.id)).toEqual([]);
    expect(g.arrows).toHaveLength(3); // t1>t2, t2>qa, t3>qa
    expectClear(g);
  });

  it("REQ-UI-117 a chip on a box of the first tier keeps clear of the top of the canvas", () => {
    const far = bead(`${E12}.20`, { parent: E12, waits_for: { plan: "p", number: 7, track_id: null, lane: null } });
    const a = track(11, "x", { blocked_by: [far.id] });
    const beads = [epic, a, far];
    const g = graphOf(beads, new Set(beads.map((b) => b.id)));
    expect(Math.min(...g.chips.map((c) => c.y))).toBeGreaterThanOrEqual(LANE_GRAPH.margin);
    expect(boxOf(g, "x").y).toBe(LANE_GRAPH.margin + 20);
  });

  it("REQ-UI-117 an open gate whose track is in the same lane draws a chip on an arrow in the gap under the cards", () => {
    const a = track(11, "x");
    const g11 = bead(`${E12}.30`, { parent: E12, waits_for: { plan: "p/team.md", number: 11, track_id: a.id, lane: "x" } });
    const b = track(12, "x", { blocked_by: [g11.id] });
    const beads = [epic, a, b, g11];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    const arrow = arrowOf(g, a.id, b.id);
    expect(arrow).toMatchObject({ toBox: false, dashed: true });
    expect(g.chips.map((c) => c.words)).toEqual(["Waiting · x #11"]);
    const box = boxOf(g, "x");
    expect(g.chips[0].y + 20).toBeLessThan(box.y + box.h);
    expectClear(g);
  });

  // REQ-UI-117 scenario "Keys between boxes"
  it("REQ-UI-117 Keys between boxes: Arrow Right from track 2 reaches track 4, and Left goes back", () => {
    const g = graphOf();
    expect(laneGraphStep(g, t2.id, "ArrowRight")).toBe(t4.id);
    expect(laneGraphStep(g, t4.id, "ArrowLeft")).toBe(t2.id);
    expect(laneGraphStep(g, t1.id, "ArrowLeft")).toBeNull();
    expect(laneGraphStep(g, t4.id, "ArrowRight")).toBeNull();
    expect(laneGraphStep(g, t1.id, "ArrowRight")).toBe(t2.id);
    expect(laneGraphStep(g, t2.id, "ArrowUp")).toBeNull();
    expect(laneGraphStep(g, "nope", "ArrowRight")).toBeNull();
  });

  it("REQ-UI-117 Keys between boxes: Arrow Up and Down move to the card nearest by x in the box above or below in the same tier", () => {
    const g = graphOf();
    expect(laneGraphStep(g, t2.id, "ArrowDown")).toBe(t3.id); // be below is fe; its one card
    expect(laneGraphStep(g, t3.id, "ArrowUp")).toBe(t1.id); // be: track 1 is at the same x as track 3
    expect(laneGraphStep(g, t3.id, "ArrowDown")).toBe(t5.id); // infra: tracks 5 and 6, 5 is nearest
    expect(laneGraphStep(g, t4.id, "ArrowDown")).toBe(t7.id);
    expect(laneGraphStep(g, t7.id, "ArrowDown")).toBeNull();
    expect(laneGraphStep(g, t4.id, "ArrowUp")).toBeNull();
  });

  it("REQ-UI-117 Keys between boxes: without an arrow, Right goes to the card of the next tier nearest by y, Left to the previous tier", () => {
    const g = graphOf();
    // track 6 (infra) has no arrow to tier 1, so the card of tier 1 nearest by y is used
    const y6 = cardOf(g, t6.id).y;
    const tier1 = g.cards.filter((c) => boxOf(g, c.lane).tier === 1);
    const best = [...tier1].sort((a, b) => Math.abs(a.y - y6) - Math.abs(b.y - y6))[0];
    expect(laneGraphStep(g, t6.id, "ArrowRight")).toBe(best.bead.id);
    expect(laneGraphStep(g, t7.id, "ArrowLeft")).not.toBeNull();
  });

  it("REQ-UI-117 laneGraphChain follows the arrows up and down and names them from>to", () => {
    const g = graphOf();
    const chain = laneGraphChain(g, t2.id);
    expect([...chain.nodes].sort()).toEqual([t1.id, t2.id, t4.id].sort());
    expect([...chain.arrows].sort()).toEqual([`${t1.id}>${t2.id}`, `${t2.id}>${t4.id}`].sort());
    expect([...laneGraphChain(g, t7.id).nodes]).toEqual([t7.id]);
  });

  it("REQ-UI-117 laneGraphLines has one line per lane then one per arrow, with stable keys", () => {
    const lines = laneGraphLines(graphOf());
    expect(lines.slice(0, 5).map((l) => l.key)).toEqual(["lane:be", "lane:fe", "lane:infra", "lane:qa", "lane:"]);
    expect(lines.slice(5).map((l) => l.key).sort()).toEqual(
      [`arrow:${t1.id}>${t2.id}`, `arrow:${t5.id}>${t6.id}`, `arrow:${t2.id}>${t4.id}`, `arrow:${t3.id}>${t4.id}`].sort(),
    );
    expect(new Set(lines.map((l) => l.key)).size).toBe(lines.length);
    expect(lines[0].text).toMatch(/^be: Running, ann · lease until .* · 1\/2 closed$/);
    expect(lines.find((l) => l.key === "lane:")?.text).toBe("No lane: 1/2 closed");
    expect(lines.find((l) => l.key === `arrow:${t2.id}>${t4.id}`)?.text).toBe("qa #4 waits for be #2: merge pending");
    expect(lines.find((l) => l.key === `arrow:${t3.id}>${t4.id}`)?.text).toBe("qa #4 waits for fe #3: merged");
    expect(lines.find((l) => l.key === `arrow:${t1.id}>${t2.id}`)?.text).toBe("be #2 waits for be #1");
  });

  it("REQ-UI-117 no arrow crosses a card or a header and no two chips meet, in the ex-e12 shape", () => {
    const g = graphOf();
    expect(g.arrows.length).toBeGreaterThan(0);
    expectColumns(g);
    expectChipsInGaps(g);
    expectClear(g);
  });

  it("REQ-UI-117 an arrow from a card that is not the lowest of its layer leaves through the gap beside it", () => {
    const a = track(11, "x");
    const b = track(12, "x");
    const z = track(13, "z", { blocked_by: [a.id] });
    const beads = [epic, a, b, z];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    expect(arrowOf(g, a.id, z.id)).toBeDefined();
    expectClear(g);
  });

  it("REQ-UI-117 an arrow that skips a tier runs in a channel below every box", () => {
    const a = track(11, "a");
    const b = track(12, "b", { blocked_by: [a.id] });
    const c = track(13, "c", { blocked_by: [b.id, a.id] });
    const beads = [epic, a, b, c];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    expect(g.boxes.map((x) => [x.lane, x.tier])).toEqual([["a", 0], ["b", 1], ["c", 2]]);
    const skip = arrowOf(g, a.id, c.id);
    const bottom = Math.max(...g.boxes.map((x) => x.y + x.h));
    expect(Math.max(...sample(skip?.d ?? "").map((p) => p.y))).toBeGreaterThan(bottom);
    expect(g.height).toBeGreaterThan(bottom);
    expectEndsOnBox(g, a.id, c.id);
    expectColumns(g);
    expectClear(g);
  });

  it("REQ-UI-117 many gated arrows into one box keep their chips apart", () => {
    const sources = [11, 12, 13, 14].map((n) => track(n, "src", { status: "closed" }));
    const gates = sources.map((s, i) => bead(`${E12}.${40 + i}`, { parent: E12, waits_for: { plan: "p/team.md", number: 11 + i, track_id: s.id, lane: "src" } }));
    const sink = track(20, "sink", { blocked_by: gates.map((x) => x.id) });
    const beads = [epic, ...sources, ...gates, sink];
    const g = graphOf(beads, new Set(beads.map((b) => b.id)));
    expect(g.chips).toHaveLength(4);
    expectChipsInGaps(g);
    expectColumns(g);
    expectClear(g);
  });

  it("REQ-UI-117 Lanes in a loop: they share one tier, are listed in cycle, and both arrows run in the channel below the boxes", () => {
    const a = track(11, "a");
    const b = track(12, "b", { blocked_by: [a.id] });
    const a2 = track(13, "a", { blocked_by: [b.id] });
    const c = track(14, "c", { blocked_by: [a2.id] });
    const beads = [epic, a, b, a2, c];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    expect(boxOf(g, "a").tier).toBe(boxOf(g, "b").tier);
    expect(boxOf(g, "c").tier).toBe(boxOf(g, "a").tier + 1);
    expect(g.cycle).toEqual(expect.arrayContaining(["a", "b"]));
    expect(g.cycle).not.toContain("c");
    // every dependency between boxes is drawn, also the ones inside a tier, and ends on the left edge of its box
    expect(g.arrows.map((x) => `${x.from}>${x.to}`).sort()).toEqual([`${a.id}>${b.id}`, `${b.id}>${a2.id}`, `${a2.id}>${c.id}`].sort());
    for (const arrow of g.arrows) expectEndsOnBox(g, arrow.from, arrow.to);
    const bottom = Math.max(...g.boxes.map((x) => x.y + x.h));
    for (const [from, to] of [[a.id, b.id], [b.id, a2.id]]) expect(Math.max(...sample(arrowOf(g, from, to)?.d ?? "").map((p) => p.y)), `${from}>${to}`).toBeGreaterThan(bottom);
    expectColumns(g);
    expect(laneGraphLines(g).map((l) => l.key)).toEqual(expect.arrayContaining([`arrow:${a.id}>${b.id}`, `arrow:${b.id}>${a2.id}`]));
    expectClear(g);
  });

  it("REQ-UI-117 a dependency from a lane to No lane gets an arrow, and No lane is tiered after the lane", () => {
    const a = track(11, "x");
    const n = track(12, null, { blocked_by: [a.id] });
    const beads = [epic, a, n];
    const g = graphOf(beads, new Set(beads.map((b) => b.id)));
    expect(g.boxes.map((b) => [b.lane, b.tier])).toEqual([["x", 0], [null, 1]]);
    expectEndsOnBox(g, a.id, n.id);
    expect(laneGraphLines(g).map((l) => l.key)).toContain(`arrow:${a.id}>${n.id}`);
    expectClear(g);
  });

  it("REQ-UI-117 a dependency from No lane to a lane gets an arrow, and No lane is tiered before the lane", () => {
    const n = track(11, null);
    const a = track(12, "x", { blocked_by: [n.id] });
    const beads = [epic, n, a];
    const g = graphOf(beads, new Set(beads.map((b) => b.id)));
    expect(g.boxes.map((b) => [b.lane, b.tier])).toEqual([[null, 0], ["x", 1]]);
    expectEndsOnBox(g, n.id, a.id);
    expectClear(g);
  });

  it("REQ-UI-117 an arrow back to an earlier tier runs in the channel below and ends on the left edge of its box", () => {
    const a = track(11, "a");
    const b = track(12, "b", { blocked_by: [a.id] });
    const c = track(13, "c", { blocked_by: [b.id] });
    const back = { ...a, blocked_by: [c.id] };
    const beads = [epic, back, b, c];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    expect(g.cycle.slice(0, 3)).toEqual(["a", "b", "c"]);
    for (const [from, to] of [[a.id, b.id], [b.id, c.id], [c.id, a.id]]) expectEndsOnBox(g, from, to);
    const bottom = Math.max(...g.boxes.map((x) => x.y + x.h));
    const ys = sample(arrowOf(g, c.id, a.id)?.d ?? "").map((p) => p.y);
    expect(Math.max(...ys)).toBeGreaterThan(bottom);
    expect(Math.min(...sample(arrowOf(g, c.id, a.id)?.d ?? "").map((p) => p.x))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(g.height);
    expectColumns(g);
    expectClear(g);
  });

  it("REQ-UI-117 two gated arrows that skip a layer keep their chips inside the box, apart, and off the other arrows", () => {
    const a = track(11, "x");
    const g1 = bead(`${E12}.31`, { parent: E12, waits_for: { plan: "p/team.md", number: 11, track_id: a.id, lane: "x" } });
    const b = track(12, "x", { blocked_by: [a.id] });
    const g2b = bead(`${E12}.32`, { parent: E12, waits_for: { plan: "p/team.md", number: 12, track_id: b.id, lane: "x" } });
    const c = track(13, "x", { blocked_by: [b.id, g1.id] });
    const d = track(14, "x", { blocked_by: [c.id, g2b.id] });
    const beads = [epic, a, b, c, d, g1, g2b];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    const box = boxOf(g, "x");
    expect(g.chips).toHaveLength(2);
    for (const chip of g.chips) {
      const rect = { x: chip.x, y: chip.y, w: chip.w, h: 20 };
      expect(rect.x).toBeGreaterThanOrEqual(box.x);
      expect(rect.x + rect.w).toBeLessThanOrEqual(box.x + box.w);
      expect(rect.y).toBeGreaterThanOrEqual(box.y);
      expect(rect.y + rect.h).toBeLessThanOrEqual(box.y + box.h);
      for (const other of g.arrows.filter((x) => x.chip?.x !== chip.x || x.chip?.y !== chip.y)) {
        for (const p of sample(other.d)) expect(inside(rect, p), `${chip.words} over ${other.from}>${other.to}`).toBe(false);
      }
    }
    expectClear(g);
  });

  it("REQ-UI-117 cards of a dependency cycle inside a lane keep the order track number then id and are listed in cycle", () => {
    const a = track(11, "x", { blocked_by: [`${E12}.12`] });
    const b = track(12, "x", { blocked_by: [a.id] });
    const beads = [epic, a, b];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    expect(g.cycle).toEqual(expect.arrayContaining([a.id, b.id]));
    expect(g.cards).toHaveLength(2);
    expectClear(g);
  });

  it("REQ-UI-117 width and height cover every box, chip and the margin", () => {
    const g = graphOf();
    expect(g.width).toBe(Math.max(...g.boxes.map((b) => b.x + b.w), ...g.chips.map((c) => c.x + c.w)) + LANE_GRAPH.margin);
    expect(g.height).toBe(Math.max(...g.boxes.map((b) => b.y + b.h), ...g.chips.map((c) => c.y + 20)) + LANE_GRAPH.margin);
  });
});

/** The sampled points of every arrow but `own`, inside the chip grown by `by`. */
function crossing(g: LaneGraph, chip: { x: number; y: number; w: number }, own: LaneGraphArrow | undefined, by: number) {
  const rect = { x: chip.x - by, y: chip.y - by, w: chip.w + 2 * by, h: 20 + 2 * by };
  return g.arrows.filter((a) => a !== own).flatMap((a) => sample(a.d).filter((p) => inside(rect, p)).map(() => `${a.from}>${a.to}`));
}

describe("laneGraph chips and arrows", () => {
  it("REQ-UI-117 Gate chips: six lanes gated to one lane keep every chip off the other arrows in the gap", () => {
    const sources = [1, 2, 3, 4, 5, 6].map((n) => track(10 + n, `l${n}`));
    const gates = sources.map((s, i) => bead(`${E12}.${40 + i}`, { parent: E12, waits_for: { plan: "p/team.md", number: 11 + i, track_id: s.id, lane: s.lane } }));
    const sink = track(20, "z", { blocked_by: gates.map((x) => x.id) });
    const beads = [epic, ...sources, ...gates, sink];
    const g = graphOf(beads, new Set(beads.map((b) => b.id)));
    expect(g.chips).toHaveLength(6);
    for (const chip of g.chips) expect(crossing(g, chip, g.arrows.find((a) => a.chip?.x === chip.x && a.chip?.y === chip.y), 0), chip.words).toEqual([]);
    expectChipsInGaps(g);
    expectColumns(g);
    expectClear(g);
  });

  it("REQ-UI-117 Gate chips: the line that leaves a card of an earlier layer keeps clear of a chip inside the box", () => {
    const a1 = track(11, "a");
    const a2 = track(12, "a", { blocked_by: [a1.id] });
    const gate = bead(`${E12}.31`, { parent: E12, waits_for: { plan: "p/team.md", number: 11, track_id: a1.id, lane: "a" } });
    const a3 = track(13, "a", { blocked_by: [a2.id, gate.id] });
    const b1 = track(14, "b", { blocked_by: [a1.id] });
    const beads = [epic, a1, a2, a3, b1, gate];
    const g = graphOf(beads, new Set(beads.map((x) => x.id)));
    const chip = g.chips[0];
    expect(chip.words).toBe("Waiting · a #11");
    expect(crossing(g, chip, g.arrows.find((x) => x.chip !== null), LANE_CHIP.clear)).toEqual([]);
    expectClear(g);
  });
});

/** A small deterministic generator (mulberry32), so the random graphs are the same on every run. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("laneGraph random graphs", () => {
  it("REQ-UI-117 a few hundred random graphs keep columns, chips in gaps, clear arrows and chips off other arrows", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const rnd = seeded(seed);
      const pick = (n: number) => Math.floor(rnd() * n);
      const lanes = 2 + pick(5);
      const tracks: BeadSummary[] = [];
      const gates: BeadSummary[] = [];
      let number = 11;
      const names: (string | null)[] = [...Array.from({ length: lanes }, (_, i) => `l${i}`), ...(rnd() < 0.5 ? [null] : [])];
      for (const lane of names) for (let k = 0, n = 1 + pick(2); k < n; k += 1) tracks.push(track(number++, lane));
      const linked = tracks.map((t) => {
        const blockers: string[] = [];
        for (const other of tracks) {
          if (other.id === t.id || rnd() > 0.2) continue;
          if (rnd() < 0.5) blockers.push(other.id);
          else {
            const gate = bead(`${E12}.${100 + gates.length}`, {
              parent: E12,
              status: rnd() < 0.5 ? "closed" : "open",
              waits_for: { plan: "p/team.md", number: other.track?.number ?? 0, track_id: other.id, lane: other.lane },
            });
            gates.push(gate);
            blockers.push(gate.id);
          }
        }
        return { ...t, blocked_by: blockers };
      });
      const beads = [epic, ...linked, ...gates];
      const g = graphOf(beads, new Set(beads.map((b) => b.id)));
      const label = `seed ${seed}`;
      try {
        expectColumns(g);
        expectChipsInGaps(g);
        expectClear(g);
        // chips between boxes; the chips of arrows inside a box share their layer gaps and keep the checks of their own tests
        for (const chip of g.chips.filter((c) => c.box === null && g.arrows.some((a) => a.toBox && a.chip?.x === c.x && a.chip?.y === c.y))) {
          const own = g.arrows.find((a) => a.chip?.x === chip.x && a.chip?.y === chip.y);
          for (const a of g.arrows.filter((x) => x !== own)) {
            for (const p of sample(a.d)) if (inside({ x: chip.x, y: chip.y, w: chip.w, h: 20 }, p)) expect.fail(`${chip.words} over ${a.from}>${a.to} at ${p.x},${p.y}`);
          }
        }
      } catch (error) {
        throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
    }
  }, 120_000);
});

describe("laneGraph header and colours", () => {
  // REQ-UI-118 scenario "Header"
  it("REQ-UI-118 Header: the be box carries Running and the holder, lease and closed count", () => {
    const be = boxOf(graphOf(), "be");
    expect(be.state).toEqual({ kind: "running", words: "Running" });
    expect(be.meta).toBe(`ann · lease until ${factDate("2099-01-01T16:00:00Z")} · 1/2 closed`);
  });

  it("REQ-UI-118 a lane with no holder reads Unclaimed, and a closed lane shows only the count", () => {
    const g = graphOf();
    expect(boxOf(g, "qa").meta).toBe("Unclaimed · 0/1 closed");
    const done = graphOf([epic, track(11, "x", { status: "closed" })], new Set([`${E12}.11`]));
    expect(boxOf(done, "x").state?.kind).toBe("closed");
    expect(boxOf(done, "x").meta).toBe("1/1 closed");
  });

  // REQ-UI-118 scenario "Colours follow the lane name"
  it("REQ-UI-118 Colours follow the lane name: fe is colour 2 with and without the filter", () => {
    const all = graphOf();
    expect(["be", "fe", "infra", "qa"].map((l) => boxOf(all, l).slot)).toEqual([1, 2, 3, 4]);
    const bao = graphOf(BEADS, new Set([t3.id]));
    expect(bao.boxes.map((b) => [b.lane, b.slot])).toEqual([["fe", 2]]);
    expect(laneSlots(BEADS, E12)).toEqual(new Map([["be", 1], ["fe", 2], ["infra", 3], ["qa", 4]]));
  });

  it("REQ-UI-118 colours count again from 1 after 8", () => {
    const names = "abcdefghij".split("");
    const beads = [epic, ...names.map((n, i) => track(i + 1, n))];
    const slots = laneSlots(beads, E12);
    expect(names.map((n) => slots.get(n))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 1, 2]);
  });

  // REQ-UI-118 scenario "No lane box"
  it("REQ-UI-118 No lane box: slot 0, no state and the count over all its tracks", () => {
    const none = boxOf(graphOf(), null);
    expect(none).toMatchObject({ slot: 0, state: null, meta: "1/2 closed" });
    expect(laneSlots(BEADS, E12).has("")).toBe(false);
  });
});
