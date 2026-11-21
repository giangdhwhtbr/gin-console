// Stubs for the epic page (REQ-UI-119..122): the bead page, its workflow and the milestone list it reads.
import type { Page } from '@playwright/test';
import { type BeadSummary, type MilestoneEntry, type Reply, list } from './api';
import { E12, PROJECT, e12, plain, stubExample } from './lanes';

export type Workflow = { stage: string; gates: Record<string, string>; warnings: string[]; review_waivers: { task_id: string; reason: string; actor: string }[] };

/** 4 of 6 gates satisfied, stage execute, no warnings and no waivers (TC-UI-200). */
export const workflow = (o: Partial<Workflow> = {}): Workflow => ({
  stage: 'execute',
  gates: { discussed: 'satisfied', plan_approved: 'satisfied', orchestrated: 'satisfied', tracks_ready: 'satisfied', reviewed: 'unmet', shipped: 'unmet' },
  warnings: [],
  review_waivers: [],
  ...o,
});

/** The bead pages of `beads`, `GET /api/beads/<p>/<id>/workflow` (a `Reply` answers a failure) and `GET /api/milestones?project=<p>`. Later routes win, so this goes after `stubExample`. */
export async function stubEpicPage(
  page: Page,
  opts: { project?: string; workflow?: Workflow | Reply; milestones?: MilestoneEntry[]; today?: string } = {},
): Promise<{ calls: URL[] }> {
  const project = opts.project ?? PROJECT;
  const calls: URL[] = [];
  await page.route(new RegExp(`/api/beads/${project}/[^/]+/workflow$`), async (route) => {
    calls.push(new URL(route.request().url()));
    const w = opts.workflow ?? workflow();
    const reply: Reply = 'body' in w ? w : { body: w };
    await route.fulfill({ status: reply.status ?? 200, json: reply.body });
  });
  await page.route((url) => url.pathname === '/api/milestones' && url.searchParams.get('project') === project, (route) => {
    const milestones = opts.milestones ?? [];
    return route.fulfill({ json: { ...list(milestones, { today: opts.today ?? '2026-11-20' }), forecast: null, days_per_point: null } });
  });
  return { calls };
}

/** The ex-e12 epic of the example project with two comments, as its page reads it. */
export const withComments = (beads: BeadSummary[], id = E12, count = 2): BeadSummary[] => beads.map((b) => (b.id === id ? { ...b, comment_count: count } : b));

/** `e12()` with points 3, 5 and 3 on the tracks 1 (closed), 2 (in progress) and 3 (closed), and track 6 closed: 8 tracks, 4 closed, 1 in progress, 2 ready, 1 blocked. */
export const e12Counted = (): BeadSummary[] =>
  e12().map((b) => {
    const points: Record<string, number> = { [`${E12}.1`]: 3, [`${E12}.2`]: 5, [`${E12}.3`]: 3 };
    if (b.id === `${E12}.6`) return { ...b, status: 'closed', ready: false, claim: null, closed_at: '2026-11-11T00:00:00Z' };
    return b.id in points ? { ...b, points: points[b.id] } : b;
  });

/** An epic page with `beads` (default ex-e12 with two comments and the plain epic ex-e3), its workflow and milestones. */
export async function openEpicStubs(page: Page, beads: BeadSummary[] = [...withComments(e12Counted()), ...plain()], opts: Parameters<typeof stubEpicPage>[1] = {}) {
  await stubExample(page, beads);
  return stubEpicPage(page, opts);
}
