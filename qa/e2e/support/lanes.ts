// The ex-e12 epic of the example project, as the server reports it for the Lanes view (REQ-UI-111..116):
// lanes be (T1 closed, T2 in progress with a lease), fe (T3 closed), qa (T4, blocked by two merge gates),
// infra (T5 closed, T6 open with an expired lease) and two tracks without a lane. Shared by the lanes specs.
import type { Page } from '@playwright/test';
import { bead, stubApi, type BeadSummary, type Stub } from './api';

export const PROJECT = 'example';
export const E12 = 'ex-e12';
export const PLAN = '.planning/plans/2026-11-20-shop.md';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The local time `days` from now at hh:mm, as the ISO string a claim carries. */
export const at = (days: number, hh: number, mm = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};
/** How the console writes a date and time (lib/dates.ts factDate), in the browser's zone. */
export const shown = (iso: string): string => {
  const d = new Date(iso);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
export const TOMORROW_16 = at(1, 16);
export const YESTERDAY_10 = at(-1, 10);

const base = (o: Partial<BeadSummary>): Partial<BeadSummary> => ({ milestone: 'ex-m2', ...o });
export const track = (n: number, lane: string | null, o: Partial<BeadSummary> = {}): BeadSummary =>
  bead(`${E12}.${n}`, base({ title: `Track ${n}`, parent: E12, lane, track: { plan: PLAN, number: n }, labels: lane === null ? [`track:${n}`] : [`lane:${lane}`, `track:${n}`], ...o }));
/** A merge gate: a placeholder bead for a track of another plan, titled `external: <plan>#<n>`. */
export const gate = (id: string, n: number, trackId: string | null, lane: string | null, o: Partial<BeadSummary> = {}): BeadSummary =>
  bead(id, base({ title: `external: ${PLAN}#${n}`, waits_for: { plan: PLAN, number: n, track_id: trackId, lane }, ...o }));

export const epic = (): BeadSummary => bead(E12, base({ title: 'Team checkout', issue_type: 'epic', status: 'in_progress' }));
export const t1 = (): BeadSummary => track(1, 'be', { status: 'closed', assignee: 'ann', closed_at: '2026-11-10T00:00:00Z' });
export const t2 = (): BeadSummary =>
  track(2, 'be', { status: 'in_progress', assignee: 'ann', blocked_by: [`${E12}.1`], dependency_count: 1, claim: { holder: 'ann', expires_at: TOMORROW_16 } });
export const t3 = (): BeadSummary => track(3, 'fe', { status: 'closed', assignee: 'bao', closed_at: '2026-11-10T00:00:00Z' });
export const g2 = (): BeadSummary => gate(`${E12}.9`, 2, `${E12}.2`, 'be', { parent: E12, blocked: false });
export const g3 = (): BeadSummary => gate('ex-g3', 3, `${E12}.3`, 'fe', { status: 'closed', closed_at: '2026-11-10T00:00:00Z' });
export const t4 = (): BeadSummary =>
  track(4, 'qa', { blocked: true, blocked_by: [`${E12}.9`, 'ex-g3'], dependency_count: 2 });
export const t5 = (): BeadSummary => track(5, 'infra', { status: 'closed', assignee: 'chi', closed_at: '2026-11-10T00:00:00Z' });
export const t6 = (): BeadSummary =>
  track(6, 'infra', { assignee: 'chi', ready: true, claim: { holder: 'chi', expires_at: YESTERDAY_10 } });
export const t7 = (): BeadSummary => track(7, null, { ready: true });
export const t8 = (): BeadSummary => track(8, null, { ready: true });

/** An epic of the example project whose tracks have no lane. */
export const plain = (): BeadSummary[] => [
  bead('ex-e3', { title: 'Billing exports for finance', issue_type: 'epic' }),
  bead('ex-e3.1', { title: 'Export CSV', parent: 'ex-e3', ready: true }),
];

/** The beads `GET /api/beads?project=example&closed=1` answers, ex-e12 first. */
export const e12 = (): BeadSummary[] => [epic(), t1(), t2(), t3(), g2(), g3(), t4(), t5(), t6(), t7(), t8()];

export const milestoneOptions = {
  milestones: [{ id: 'ex-m2', title: 'Beta readiness', status: 'active' as const, start: '2026-11-02', end: '2026-11-27' }],
  current: null,
};

/**
 * Answers the bead page of each of `beads` (and its empty comments) the way the server does: blockers in
 * `dependencies` (a merge gate carries `waits_for`), the beads it blocks in `dependents`, its children.
 * Register it after `stubApi`: the later route wins.
 */
export async function stubDetails(page: Page, beads: BeadSummary[], project = PROJECT): Promise<void> {
  const byId = new Map(beads.map((b) => [b.id, b]));
  const relation = (b: BeadSummary) => ({ id: b.id, title: b.title, status: b.status, type: 'blocks', waits_for: b.waits_for });
  const pattern = new RegExp(`/api/beads/${project}/([^/]+)(/comments)?$`);
  await page.route(pattern, async (route) => {
    const match = pattern.exec(new URL(route.request().url()).pathname)!;
    const found = byId.get(decodeURIComponent(match[1]));
    if (found === undefined) return route.fulfill({ status: 404, json: { error: 'not found' } });
    if (match[2] !== undefined) return route.fulfill({ json: [] });
    await route.fulfill({
      json: {
        ...found, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null,
        dependencies: found.blocked_by.flatMap((id) => (byId.has(id) ? [relation(byId.get(id)!)] : [])),
        dependents: beads.filter((b) => b.blocked_by.includes(found.id)).map(relation),
        children: beads.filter((b) => b.parent === found.id).map((c) => ({ ...relation(c), type: 'parent-child', prep: false })),
        bugs: [],
      },
    });
  });
}

/** Routes /api for the example project with `beads` (default: ex-e12 and a plain epic) and its bead pages. */
export async function stubExample(page: Page, beads: BeadSummary[] = [...e12(), ...plain()]): Promise<Stub> {
  const stub = await stubApi(page, { projects: [PROJECT], beads, milestoneOptions });
  await stubDetails(page, beads);
  return stub;
}

/** The value of the fact `label` inside `scope` (a `<dl>` of label/value pairs). */
export const factOf = (scope: import('@playwright/test').Locator, label: string) =>
  scope.locator('dl > div').filter({ has: scope.page().getByText(label, { exact: true }) }).locator('dd');

export type Box = { x: number; y: number; w: number; h: number };
export type Geometry = {
  cards: Record<string, Box>;
  headers: Box[];
  markers: Record<string, Box & { text: string }>;
  /** Every arrow of the canvas: the points of its polyline, in page coordinates. */
  arrows: { x: number; y: number }[][];
};

/** The boxes of the Lanes canvas (cards, lane headers, markers) and the polylines of its arrows, in page coordinates. */
export const geometry = (page: Page): Promise<Geometry> =>
  page.getByTestId('lanes-canvas').evaluate((canvas) => {
    const box = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const cards: Geometry['cards'] = {};
    for (const el of canvas.querySelectorAll<HTMLElement>('[data-node]')) cards[el.dataset.node!] = box(el);
    const markers: Geometry['markers'] = {};
    for (const el of canvas.querySelectorAll<HTMLElement>('[data-marker]')) markers[el.dataset.marker!] = { ...box(el), text: el.textContent ?? '' };
    const svg = canvas.querySelector('svg:has(polyline)')!.getBoundingClientRect();
    const arrows = Array.from(canvas.querySelectorAll('polyline')).map((line) =>
      (line.getAttribute('points') ?? '').trim().split(/\s+/).map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return { x: svg.x + x, y: svg.y + y };
      }),
    );
    return { cards, headers: Array.from(canvas.querySelectorAll('section')).map(box), markers, arrows };
  });

const near = (a: number, b: number) => Math.abs(a - b) < 1.5;
/** The arrow that leaves the right middle of card `from` and enters the left middle of card `to`. */
export const arrowBetween = (g: Geometry, from: string, to: string) => {
  const a = g.cards[from];
  const b = g.cards[to];
  return g.arrows.find((p) => {
    const first = p[0];
    const last = p[p.length - 1];
    return near(first.x, a.x + a.w) && near(first.y, a.y + a.h / 2) && near(last.x, b.x) && near(last.y, b.y + b.h / 2);
  });
};

const inside = (r: Box, x: number, y: number, by = 1) => x > r.x + by && x < r.x + r.w - by && y > r.y + by && y < r.y + r.h - by;
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Whether a polyline passes through the box (its segments are horizontal or vertical). */
export const crosses = (points: { x: number; y: number }[], r: Box): boolean =>
  points.slice(1).some((q, i) => {
    const p = points[i];
    const steps = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y));
    for (let s = 0; s <= steps; s += 1) {
      const t = steps === 0 ? 0 : s / steps;
      if (inside(r, p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t)) return true;
    }
    return false;
  });
/** What the canvas draws over something it should not: arrows and markers over cards and headers, markers over each other. */
export const collisions = (g: Geometry): string[] => {
  const found: string[] = [];
  const solids = [...Object.entries(g.cards), ...g.headers.map((h, i) => [`header ${i}`, h] as const)];
  g.arrows.forEach((points, i) => {
    for (const [name, r] of solids) if (crosses(points, r)) found.push(`arrow ${i} crosses ${name}`);
  });
  for (const [id, m] of Object.entries(g.markers)) {
    for (const [name, r] of solids) if (overlaps(m, r)) found.push(`marker ${id} overlaps ${name}`);
  }
  return found;
};
