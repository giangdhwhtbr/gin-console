import type { BeadSummary } from "./api";
import { cycleNodes, type StepKey } from "./graph";
import { depsOf, depthsOf, LANE, laneName, lanesOf, trackNumber, type Dep, type LaneState } from "./lanes";
import { gateState, gateWords } from "./mergeGates";

/** REQ-UI-117, REQ-UI-118: the sizes of the lane boxes in the Graph view in px. */
export const LANE_GRAPH = { margin: 16, pad: 14, head: 52, cardGap: 32, stackGap: 16, boxGap: 32, tierGap: 140 } as const;
/** The chips on the arrows: `wide` fits "Waiting · be #2", `long` fits "Waiting for track 7". */
export const LANE_CHIP = { h: 20, wide: 120, long: 152, step: 8, clear: 4 } as const;
/** The number of lane colours (`--lane-1..8`). */
const SLOTS = 8;

export type LaneBoxLayout = {
  /** `null` is the box "No lane". */
  lane: string | null;
  /** 1..8 the lane colour, 0 for "No lane". */
  slot: number;
  tier: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** REQ-UI-112; `null` for "No lane". */
  state: LaneState | null;
  /** Line 2 of the header: "ann · lease until 21 Nov 16:00 · 1/2 closed", or "1/2 closed". */
  meta: string;
};
export type LaneGraphCard = { bead: BeadSummary; lane: string | null; x: number; y: number; layer: number; stack: number };
export type LaneGraphArrow = {
  from: string;
  to: string;
  /** The arrow ends on the left edge of the box of `to`. */
  toBox: boolean;
  gate: BeadSummary | null;
  /** Through a gate that is not closed. */
  dashed: boolean;
  /** An SVG path of `M`, `L` and `C` commands. */
  d: string;
  /** The top left of its chip. */
  chip: { x: number; y: number } | null;
};
export type LaneGraphChip = {
  gate: BeadSummary;
  kind: "waiting" | "merged";
  words: string;
  /** The top left; the height is `LANE_CHIP.h`. */
  x: number;
  y: number;
  w: number;
  /** The lane of the waiting box (`""` for "No lane") when the gate's track is not drawn; `null` for a chip on an arrow. */
  box: string | null;
};
export type LaneGraph = {
  boxes: LaneBoxLayout[];
  cards: LaneGraphCard[];
  arrows: LaneGraphArrow[];
  chips: LaneGraphChip[];
  /** Lanes that wait for each other in a loop, then the cards of a dependency loop. */
  cycle: string[];
  width: number;
  height: number;
};
export type LaneGraphLine = { key: string; text: string };

type Lane = string | null;
type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Shaped = { bead: BeadSummary; layer: number; stack: number };
type Wanted = { chip: LaneGraphChip; arrow: LaneGraphArrow | null; slide?: { lo: number; hi: number; avoid: () => readonly Rect[] } };

/** REQ-UI-118: the colour of a lane is its position among the sorted lane names of the scope, counted again from 1 after 8. */
export function laneSlots(beads: readonly BeadSummary[], scopeId: string): Map<string, number> {
  const names = [...new Set(beads.filter((b) => b.parent === scopeId && b.waits_for == null).flatMap((b) => (b.lane === null ? [] : [b.lane])))];
  names.sort((a, b) => a.localeCompare(b));
  return new Map(names.map((name, i) => [name, (i % SLOTS) + 1]));
}

/** Strongly connected components of the lane graph, in no particular order. */
function components(nodes: readonly string[], next: ReadonlyMap<string, readonly string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const result: string[][] = [];
  const visit = (node: string) => {
    const at = index.size;
    index.set(node, at);
    low.set(node, at);
    stack.push(node);
    for (const to of next.get(node) ?? []) {
      if (!index.has(to)) {
        visit(to);
        low.set(node, Math.min(low.get(node) ?? at, low.get(to) ?? at));
      } else if (stack.includes(to)) {
        low.set(node, Math.min(low.get(node) ?? at, index.get(to) ?? at));
      }
    }
    if (low.get(node) === at) {
      const part: string[] = [];
      for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
        part.push(top);
        if (top === node) break;
      }
      result.push(part);
    }
  };
  for (const node of nodes) if (!index.has(node)) visit(node);
  return result;
}

/** "No lane" is a node of the lane graph like a lane; no lane is named this. */
const NO_LANE = "\u0000";

/**
 * The tier of each lane: after every lane it waits for; lanes that wait for each other share one.
 * "No lane" is tiered the same way, and stays in the last tier when it has no dependency with a lane.
 */
function tiersOf(lanes: readonly Lane[], deps: readonly Dep[], laneOf: ReadonlyMap<string, Lane>): { tier: Map<Lane, number>; cycle: string[] } {
  const nodes = lanes.map((l) => l ?? NO_LANE);
  const next = new Map<string, string[]>();
  const into = new Map<string, Set<string>>();
  const linked = new Set<string>();
  for (const { from, to } of deps) {
    const a = laneOf.get(from);
    const b = laneOf.get(to);
    if (a === undefined || b === undefined || a === b) continue;
    const [x, y] = [a ?? NO_LANE, b ?? NO_LANE];
    next.set(x, [...(next.get(x) ?? []), y]);
    into.set(y, (into.get(y) ?? new Set<string>()).add(x));
    linked.add(x).add(y);
  }
  const parts = components(nodes, next);
  const partOf = new Map(parts.flatMap((part, i) => part.map((lane) => [lane, i] as const)));
  const depth = new Map<number, number>();
  const depthOf = (part: number): number => {
    const known = depth.get(part);
    if (known !== undefined) return known;
    let longest = 0;
    for (const lane of parts[part]) {
      for (const from of into.get(lane) ?? []) {
        const other = partOf.get(from);
        if (other !== undefined && other !== part) longest = Math.max(longest, depthOf(other) + 1);
      }
    }
    depth.set(part, longest);
    return longest;
  };
  const tier = new Map<Lane, number>(lanes.map((lane) => [lane, depthOf(partOf.get(lane ?? NO_LANE) ?? 0)]));
  if (tier.has(null) && !linked.has(NO_LANE)) tier.set(null, Math.max(0, ...[...tier].flatMap(([lane, t]) => (lane === null ? [] : [t]))));
  const cycle = parts
    .filter((part) => part.length > 1)
    .flat()
    .map((lane) => (lane === NO_LANE ? "No lane" : lane))
    .sort((a, b) => a.localeCompare(b));
  return { tier, cycle };
}

/** The cards of one box by dependency layer inside the lane, then track number, then id; cards of one layer stack. */
function shapeCards(cards: readonly BeadSummary[], deps: readonly Dep[]): Shaped[] {
  const ordered = [...cards].sort((a, b) => trackNumber(a) - trackNumber(b) || a.id.localeCompare(b.id));
  const ids = new Set(ordered.map((c) => c.id));
  const layer = depthsOf(ordered.map((c) => c.id), deps.filter((d) => ids.has(d.from) && ids.has(d.to)));
  const at = (b: BeadSummary) => layer.get(b.id) ?? 0;
  const sorted = ordered.sort((a, b) => at(a) - at(b));
  const seen = new Map<number, number>();
  return sorted.map((bead) => {
    const stack = seen.get(at(bead)) ?? 0;
    seen.set(at(bead), stack + 1);
    return { bead, layer: at(bead), stack };
  });
}

/** One arrow per pair of cards; a pair joined by several gates keeps an open gate, and a gate over a plain blocker. */
function oneArrowEach(deps: readonly Dep[]): Dep[] {
  const kept = new Map<string, Dep>();
  for (const dep of deps) {
    const key = `${dep.from}>${dep.to}`;
    const old = kept.get(key);
    const better = old === undefined || old.gate === null || (old.gate.status === "closed" && dep.gate !== null && dep.gate.status !== "closed");
    if (better) kept.set(key, dep);
  }
  return [...kept.values()];
}

/** The path through `points`, without repeated points and without middle points of a straight run. */
function path(points: readonly Pt[]): string {
  const list = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  const kept = list.filter((p, i) => {
    if (i === 0 || i === list.length - 1) return true;
    const a = list[i - 1];
    const b = list[i + 1];
    const straight = (a.x === p.x && p.x === b.x && (p.y - a.y) * (b.y - p.y) > 0) || (a.y === p.y && p.y === b.y && (p.x - a.x) * (b.x - p.x) > 0);
    return !straight;
  });
  return kept.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

const chipWidth = (words: string, loose: boolean) => {
  if (loose) return LANE_CHIP.long;
  const length = [...words].length;
  if (length <= 15) return LANE_CHIP.wide;
  return LANE_CHIP.long + Math.max(0, length - 19) * LANE_CHIP.step;
};
const chipRect = (c: { x: number; y: number; w: number }): Rect => ({ x: c.x, y: c.y, w: c.w, h: LANE_CHIP.h });
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const grown = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/**
 * Chips are pushed right by `LANE_CHIP.step` until none meets another chip or an obstacle (an arrowhead). A chip with
 * `slide` sits on a vertical run of its arrow and moves along it: first to a spot clear of the other arrows of its gap,
 * then to any spot on the run, then up or down beyond it.
 */
function spaced(wanted: readonly Wanted[], obstacles: readonly Rect[]): LaneGraphChip[] {
  const placed: LaneGraphChip[] = [];
  const clear = (c: LaneGraphChip, soft: readonly Rect[]) => {
    const probe = grown(chipRect(c), LANE_CHIP.clear);
    return !placed.some((p) => overlap(probe, chipRect(p))) && !obstacles.some((o) => overlap(probe, o)) && !soft.some((s) => overlap(probe, s));
  };
  for (const { chip, arrow, slide } of wanted) {
    let at = chip;
    if (slide === undefined) {
      for (let tries = 0; tries < 400 && !clear(at, []); tries += 1) at = { ...at, x: at.x + LANE_CHIP.step };
    } else {
      const offsets = [0, ...Array.from({ length: 300 }, (_, i) => (Math.floor(i / 2) + 1) * 4 * (i % 2 === 0 ? 1 : -1))];
      const centre = chip.y + LANE_CHIP.h / 2;
      const at0 = (dy: number): LaneGraphChip => ({ ...chip, y: chip.y + dy });
      const onRun = (dy: number) => centre + dy >= slide.lo - 1 && centre + dy <= slide.hi + 1;
      const avoid = slide.avoid();
      const pick =
        offsets.find((dy) => onRun(dy) && clear(at0(dy), avoid)) ?? offsets.find((dy) => onRun(dy) && clear(at0(dy), [])) ?? offsets.find((dy) => clear(at0(dy), [])) ?? 0;
      at = at0(pick);
    }
    placed.push(at);
    if (arrow !== null) arrow.chip = { x: at.x, y: at.y };
  }
  return placed;
}

/** A thin rectangle along a horizontal or vertical run, to keep chips off it. */
const run = (a: Pt, b: Pt): Rect => ({ x: Math.min(a.x, b.x) - 1, y: Math.min(a.y, b.y) - 1, w: Math.abs(a.x - b.x) + 2, h: Math.abs(a.y - b.y) + 2 });

/** How a dependency between two boxes is drawn: in the gap after its tier, or in the channel below every box. */
type Plan = { dep: Dep; ta: number; tb: number; channel: boolean; words: string | null; w: number; kind: "waiting" | "merged"; k: number; kLeave: number; kEnter: number };

/** REQ-UI-117, REQ-UI-118: boxes in tiers from left to right, the cards inside them, the arrows and the chips of the merge gates. */
export function laneGraph(beads: readonly BeadSummary[], scopeId: string, matched: ReadonlySet<string>, now: Date): LaneGraph {
  const { margin, pad, head, cardGap, stackGap, boxGap, tierGap } = LANE_GRAPH;
  const board = lanesOf(beads, scopeId, matched, now);
  const drawn = board.rows.flatMap((r) => r.cards.map((c) => c.bead));
  if (drawn.length === 0) return { boxes: [], cards: [], arrows: [], chips: [], cycle: [], width: 2 * margin, height: 2 * margin };

  const byId = new Map(beads.map((b) => [b.id, b]));
  const { deps, loose } = depsOf(drawn, byId);
  const slots = laneSlots(beads, scopeId);
  const laneOf = new Map(drawn.map((b) => [b.id, b.lane]));
  const { tier, cycle: laneCycle } = tiersOf(board.rows.map((r) => r.lane), deps, laneOf);
  const shaped = new Map<Lane, Shaped[]>(board.rows.map((r) => [r.lane, shapeCards(r.cards.map((c) => c.bead), deps)]));
  const shapeOf = new Map([...shaped.values()].flat().map((s) => [s.bead.id, s] as const));
  const tierOf = (lane: Lane) => tier.get(lane) ?? 0;
  const tiers = Math.max(...board.rows.map((r) => tierOf(r.lane))) + 1;

  // the arrows that are drawn: forwards inside a box, and every dependency between boxes (a back edge or a same-tier one runs in the channel)
  const arrowsWanted = oneArrowEach(deps).filter((dep) => {
    const a = shapeOf.get(dep.from);
    const b = shapeOf.get(dep.to);
    if (a === undefined || b === undefined) return false;
    return a.bead.lane !== b.bead.lane || b.layer > a.layer;
  });
  const gatedInside = new Map<Lane, number>();
  for (const d of arrowsWanted) {
    const lane = laneOf.get(d.from) ?? null;
    if (d.gate !== null && lane === laneOf.get(d.to)) gatedInside.set(lane, (gatedInside.get(lane) ?? 0) + 1);
  }

  // how each arrow between boxes is routed, and the room its chip and its channel need in the gaps
  const inGap = new Array<number>(tiers).fill(0);
  const leaving = new Array<number>(tiers).fill(0);
  const entering = new Array<number>(tiers).fill(0);
  const widest = new Array<number>(tiers).fill(0);
  const plans = new Map<Dep, Plan>();
  for (const dep of arrowsWanted) {
    const ta = tierOf(laneOf.get(dep.from) ?? null);
    const tb = tierOf(laneOf.get(dep.to) ?? null);
    if (laneOf.get(dep.from) === laneOf.get(dep.to)) continue;
    const gate = dep.gate;
    const words = gate !== null && gate.waits_for !== null ? `${gateState(gate.status)} · ${gateWords(gate.waits_for)}` : null;
    const channel = tb !== ta + 1;
    const w = words === null ? 0 : chipWidth(words, false);
    plans.set(dep, {
      dep,
      ta,
      tb,
      channel,
      words,
      w,
      kind: gate !== null && gate.status === "closed" ? "merged" : "waiting",
      k: channel ? 0 : inGap[ta]++,
      kLeave: channel ? leaving[ta]++ : 0,
      kEnter: channel ? entering[tb]++ : 0,
    });
    if (!channel) widest[ta] = Math.max(widest[ta], w);
  }
  const leftRoom = entering[0] > 0 ? 10 + 6 * entering[0] : 0;
  const zoneL = (t: number) => 10 + 6 * leaving[t];
  // the right zone also keeps the arrowhead (10px) and the clear space of a chip off the left edge of the next box
  const zoneR = (t: number) => (t + 1 < tiers ? 22 + 6 * entering[t + 1] : 0);
  const gapW = (t: number) => (t + 1 < tiers ? Math.max(tierGap, widest[t] + zoneL(t) + zoneR(t)) : leaving[t] > 0 ? zoneL(t) : 0);

  // boxes in columns, one per tier; each gated arrow inside a box has its own row under the cards for its chip
  const rowH = LANE_CHIP.h + 4;
  const room = (lane: Lane) => ((gatedInside.get(lane) ?? 0) === 0 ? 0 : ((gatedInside.get(lane) ?? 1) - 1) * rowH + LANE_CHIP.h - 2);
  const sizes = new Map<Lane, { layers: number; stacks: number; w: number; h: number }>();
  for (const [lane, cards] of shaped) {
    const layers = Math.max(...cards.map((c) => c.layer)) + 1;
    const stacks = Math.max(...cards.map((c) => c.stack)) + 1;
    sizes.set(lane, {
      layers,
      stacks,
      w: 2 * pad + layers * LANE.cardW + (layers - 1) * cardGap,
      h: head + 2 * pad + stacks * LANE.cardH + (stacks - 1) * stackGap + room(lane),
    });
  }
  const boxes: LaneBoxLayout[] = [];
  const colX: number[] = [];
  const colRight: number[] = [];
  const top = margin + (loose.length > 0 ? LANE_CHIP.h : 0);
  let maxBottom = top;
  let x = margin + leftRoom;
  for (let t = 0; t < tiers; t += 1) {
    let y = top;
    let wide = 0;
    for (const row of board.rows.filter((r) => tierOf(r.lane) === t)) {
      const size = sizes.get(row.lane);
      if (size === undefined) continue;
      const open = row.state !== null && row.state.kind !== "closed";
      const facts = [...(open ? [row.holders.length > 0 ? row.holders.join(", ") : "Unclaimed", ...(row.lease === null ? [] : [row.lease.text.replace(/^until/, "lease until").replace(/^expired/, "lease expired")])] : []), `${row.tracks.closed}/${row.tracks.total} closed`];
      boxes.push({ lane: row.lane, slot: row.lane === null ? 0 : (slots.get(row.lane) ?? 0), tier: t, x, y, w: size.w, h: size.h, state: row.state, meta: facts.join(" · ") });
      y += size.h;
      maxBottom = Math.max(maxBottom, y);
      y += boxGap;
      wide = Math.max(wide, size.w);
    }
    colX.push(x);
    colRight.push(x + wide);
    x += wide + gapW(t);
  }
  const boxAt = new Map(boxes.map((b) => [b.lane, b]));

  // cards
  const cards: LaneGraphCard[] = boxes.flatMap((box) =>
    (shaped.get(box.lane) ?? []).map((s) => ({
      bead: s.bead,
      lane: box.lane,
      x: box.x + pad + s.layer * (LANE.cardW + cardGap),
      y: box.y + head + pad + s.stack * (LANE.cardH + stackGap),
      layer: s.layer,
      stack: s.stack,
    })),
  );
  const cardAt = new Map(cards.map((c) => [c.bead.id, c]));

  // arrows and their chips
  const mid = LANE.cardH / 2;
  const arrows: LaneGraphArrow[] = [];
  const wanted: Wanted[] = [];
  const ends: Rect[] = [];
  const rows = new Map<Lane, number>();
  const gapSegs = new Map<number, { plan: Plan; segs: Rect[] }[]>();
  let channelY = maxBottom + 18;
  let channelEnd = maxBottom;
  for (const dep of arrowsWanted) {
    const a = cardAt.get(dep.from);
    const b = cardAt.get(dep.to);
    if (a === undefined || b === undefined) continue;
    const boxA = boxAt.get(a.lane);
    const boxB = boxAt.get(b.lane);
    const sizeA = sizes.get(a.lane);
    if (boxA === undefined || boxB === undefined || sizeA === undefined) continue;
    const gate = dep.gate;
    const arrow: LaneGraphArrow = { from: dep.from, to: dep.to, toBox: a.lane !== b.lane, gate, dashed: gate !== null && gate.status !== "closed", d: "", chip: null };
    const start = { x: a.x + LANE.cardW, y: a.y + mid };
    let chipOn: Wanted["slide"] | null = null;
    let chipAt: Pt | null = null;
    const plan = plans.get(dep);
    if (plan === undefined) {
      const end = { x: b.x, y: b.y + mid };
      const gap = start.x + cardGap / 2;
      if (gate === null && b.layer === a.layer + 1) {
        arrow.d = path([start, { x: gap, y: start.y }, { x: gap, y: end.y }, end]);
      } else {
        // the gap under the cards, where a chip fits
        const cardsBottom = boxA.y + head + pad + sizeA.stacks * LANE.cardH + (sizeA.stacks - 1) * stackGap;
        const row = rows.get(a.lane) ?? 0;
        if (gate !== null) rows.set(a.lane, row + 1);
        const under = cardsBottom + (gate === null ? pad / 2 : LANE_CHIP.h + row * rowH);
        const back = end.x - cardGap / 2;
        arrow.d = path([start, { x: gap, y: start.y }, { x: gap, y: under }, { x: back, y: under }, { x: back, y: end.y }, end]);
        chipAt = { x: (gap + back) / 2, y: under };
      }
    } else {
      // out of the box: straight from the last layer, else down the gap beside the card and along the gap under its row
      const ty = b.y + mid;
      const lastLayer = a.layer === sizeA.layers - 1;
      const exitY = lastLayer ? start.y : a.y + LANE.cardH + 10;
      const side = a.x + LANE.cardW + cardGap / 2;
      const leave: Pt[] = lastLayer ? [start] : [start, { x: side, y: start.y }, { x: side, y: exitY }];
      const endPt = { x: boxB.x, y: ty };
      ends.push({ x: boxB.x - 10, y: ty - 6, w: 10, h: 12 });
      if (!plan.channel) {
        const left = colRight[plan.ta] + zoneL(plan.ta);
        const window = boxB.x - zoneR(plan.ta) - left;
        const centre = left + window / 2;
        const cx = Math.round(centre + (plan.k - (inGap[plan.ta] - 1) / 2) * 6);
        arrow.d = path([...leave, { x: cx, y: exitY }, { x: cx, y: ty }, endPt]);
        const lo = Math.min(exitY, ty);
        const hi = Math.max(exitY, ty);
        const segs = [run({ x: colRight[plan.ta], y: exitY }, { x: cx, y: exitY }), run({ x: cx, y: lo }, { x: cx, y: hi }), run({ x: cx, y: ty }, endPt)];
        gapSegs.set(plan.ta, [...(gapSegs.get(plan.ta) ?? []), { plan, segs }]);
        chipAt = { x: centre, y: (lo + hi) / 2 };
        chipOn = { lo, hi, avoid: () => [] };
      } else {
        // down beside the source tier, along a channel under every box, up beside the target tier
        const vx = colRight[plan.ta] + 6 + plan.kLeave * 6;
        const ux = (plan.tb === 0 ? colX[0] : colX[plan.tb]) - 6 - plan.kEnter * 6;
        const chY = channelY;
        channelY += plan.words === null ? 12 : 28;
        channelEnd = plan.words === null ? chY : chY + LANE_CHIP.h / 2;
        arrow.d = path([...leave, { x: vx, y: exitY }, { x: vx, y: chY }, { x: ux, y: chY }, { x: ux, y: ty }, endPt]);
        chipAt = { x: (vx + ux) / 2, y: chY };
      }
    }
    arrows.push(arrow);
    if (gate !== null && chipAt !== null && gate.waits_for !== null) {
      const words = plan?.words ?? `${gateState(gate.status)} · ${gateWords(gate.waits_for)}`;
      const w = chipWidth(words, false);
      const kind = gate.status === "closed" ? "merged" : "waiting";
      const chip = { gate, kind, words, x: Math.round(chipAt.x - w / 2), y: Math.round(chipAt.y - LANE_CHIP.h / 2), w, box: null } as const;
      wanted.push({ chip, arrow, slide: chipOn === null ? undefined : { lo: chipOn.lo, hi: chipOn.hi, avoid: () => (gapSegs.get(plan?.ta ?? -1) ?? []).flatMap((s) => (s.plan.dep === dep ? [] : s.segs)) } });
    }
  }
  const seen = new Set<string>();
  for (const { gate, card } of loose) {
    const lane = laneOf.get(card.id) ?? null;
    const box = boxAt.get(lane);
    if (box === undefined || gate.waits_for === null || seen.has(`${gate.id}>${lane ?? ""}`)) continue;
    seen.add(`${gate.id}>${lane ?? ""}`);
    const words = gate.status === "closed" ? `Merged track ${gate.waits_for.number}` : `Waiting for track ${gate.waits_for.number}`;
    wanted.push({ chip: { gate, kind: gate.status === "closed" ? "merged" : "waiting", words, x: box.x + pad, y: box.y - LANE_CHIP.h, w: chipWidth(words, true), box: lane ?? "" }, arrow: null });
  }
  const chips = spaced(wanted, ends);

  const right = colRight[tiers - 1] + gapW(tiers - 1);
  const edge = Math.max(right, ...chips.map((c) => c.x + c.w));
  const bottom = Math.max(channelEnd, ...chips.map((c) => c.y + LANE_CHIP.h));
  const cycle = [...laneCycle, ...cycleNodes(deps.filter((d) => d.from !== d.to))];
  return { boxes, cards, arrows, chips, cycle, width: edge + margin, height: bottom + margin };
}

const orderOf = (graph: LaneGraph, card: LaneGraphCard) => graph.cards.filter((c) => c.lane === card.lane);
const tierOfCard = (graph: LaneGraph, card: LaneGraphCard) => graph.boxes.find((b) => b.lane === card.lane)?.tier ?? 0;
const nearest = (list: readonly LaneGraphCard[], key: (c: LaneGraphCard) => number, to: number): LaneGraphCard | null => {
  let best: LaneGraphCard | null = null;
  for (const c of list) if (best === null || Math.abs(key(c) - to) < Math.abs(key(best) - to)) best = c;
  return best;
};

/**
 * REQ-UI-117: Left and Right move to the previous or next card of the box; from the first or last card they go to the card
 * an arrow of the focused card comes from in the tier on the left or leads to in the tier on the right (the nearest by y),
 * else to the card of that tier nearest by y. Up and Down go to the card nearest by x in the box above or below in the same tier.
 */
export function laneGraphStep(graph: LaneGraph, id: string, key: StepKey): string | null {
  const card = graph.cards.find((c) => c.bead.id === id);
  if (card === undefined) return null;
  const tier = tierOfCard(graph, card);
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const row = orderOf(graph, card);
    const at = row.indexOf(card) + (key === "ArrowRight" ? 1 : -1);
    if (at >= 0 && at < row.length) return row[at].bead.id;
    const there = graph.cards.filter((c) => tierOfCard(graph, c) === tier + (key === "ArrowRight" ? 1 : -1));
    const linked = new Set(graph.arrows.flatMap((a) => (key === "ArrowRight" ? (a.from === id ? [a.to] : []) : a.to === id ? [a.from] : [])));
    const direct = there.filter((c) => linked.has(c.bead.id));
    return nearest(direct.length > 0 ? direct : there, (c) => c.y, card.y)?.bead.id ?? null;
  }
  const mine = graph.boxes.find((b) => b.lane === card.lane);
  if (mine === undefined) return null;
  const beside = graph.boxes.filter((b) => b.tier === mine.tier && (key === "ArrowDown" ? b.y > mine.y : b.y < mine.y));
  const next = beside.reduce<LaneBoxLayout | null>((best, b) => (best === null || Math.abs(b.y - mine.y) < Math.abs(best.y - mine.y) ? b : best), null);
  return next === null ? null : (nearest(graph.cards.filter((c) => c.lane === next.lane), (c) => c.x, card.x)?.bead.id ?? null);
}

/** The card, all its direct and indirect blockers and blocked cards, and the arrows (`from>to`) inside either side. */
export function laneGraphChain(graph: LaneGraph, id: string): { nodes: Set<string>; arrows: Set<string> } {
  const reach = (forward: boolean) => {
    const seen = new Set([id]);
    for (const todo = [id]; todo.length > 0; ) {
      const at = todo.pop();
      for (const a of graph.arrows) {
        const [near, far] = forward ? [a.from, a.to] : [a.to, a.from];
        if (near === at && !seen.has(far)) {
          seen.add(far);
          todo.push(far);
        }
      }
    }
    return seen;
  };
  const up = reach(false);
  const down = reach(true);
  const arrows = graph.arrows.filter((a) => (up.has(a.from) && up.has(a.to)) || (down.has(a.from) && down.has(a.to)));
  return { nodes: new Set([...up, ...down]), arrows: new Set(arrows.map((a) => `${a.from}>${a.to}`)) };
}

/** The lines a screen reader reads: one per lane, one per arrow, then one per chip of a track that is not drawn. */
export function laneGraphLines(graph: LaneGraph): LaneGraphLine[] {
  const cards = new Map(graph.cards.map((c) => [c.bead.id, c.bead]));
  const words = (id: string) => {
    const bead = cards.get(id);
    return bead === undefined ? id : bead.track === null ? bead.id : `${laneName(bead.lane)} #${bead.track.number}`;
  };
  const lanes = graph.boxes.map((b) => ({
    key: `lane:${b.lane ?? ""}`,
    text: `${laneName(b.lane)}: ${[b.state?.words, b.meta].flatMap((x) => (x === undefined ? [] : [x])).join(", ")}`,
  }));
  const arrows = graph.arrows.map((a) => ({
    key: `arrow:${a.from}>${a.to}`,
    text: `${words(a.to)} waits for ${words(a.from)}${a.gate === null ? "" : `: ${a.gate.status === "closed" ? "merged" : "merge pending"}`}`,
  }));
  const loose = graph.chips.flatMap((c) => (c.box === null ? [] : [{ key: `chip:${c.gate.id}>${c.box}`, text: `${c.box === "" ? "No lane" : c.box}: ${c.words}` }]));
  return [...lanes, ...arrows, ...loose];
}
