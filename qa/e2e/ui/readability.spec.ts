// REQ-UI-110 scenarios "No overlapping text" and "Contrast": every page, at four widths and in both
// themes, has no text over other visible text or a shape, no text spilling out of its box, and no text
// below WCAG contrast. The data is shaped like the example project: long titles and ids, points, a
// kicked-off milestone with velocity, a milestone past its end, Reports with long member names.
import type { Page } from '@playwright/test';
import { test, expect } from '../evidence';
import { bead, detail, entry, epicPlan, milestoneOption } from '../support/api';
import { e12 } from '../support/lanes';
import { readabilityFindings, type Finding } from '../support/readability';

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const THEMES = ['light', 'dark'] as const;

const LONG_ID = 'ex-payments-provider-migration-and-reconciliation-2026';
const LONG_TITLE = 'Payments provider migration and reconciliation across every regional ledger and settlement batch';
const LONG_MEMBER = 'nguyen.thi.thanh.huong.payments-team@example-company.com.vn';
const velocity = { committed_points: 40, completed_points: 31, added_points: 6, say_do: 0.78, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86 };

// the builders of support/api.ts cover the older shapes; these fields are the newer ones
const full = <T extends object>(base: T, extra: object): T => ({ ...base, ...extra });
const b = (id: string, o: object = {}) =>
  full(bead(id), { kind: null, capabilities: [], complexity: null, estimate_minutes: null, points: null, points_reason: null, lane: null, track: null, claim: null, waits_for: null, ...o });

const beads = [
  b('ex-e1', { title: 'Onboarding revamp', issue_type: 'epic', status: 'closed', milestone: 'ex-m1', points: 8, closed_at: '2026-10-20T00:00:00Z' }),
  b('ex-e2', { title: 'Search relevance', issue_type: 'epic', status: 'in_progress', milestone: 'ex-m2', points: 13, assignee: 'qa', kind: 'capability', capabilities: ['export-state-json-v2'], labels: ['sprint:s1'] }),
  b('ex-e3', { title: 'Billing exports for finance', issue_type: 'epic', status: 'open', milestone: 'ex-m2', points: 5, kind: 'technical', complexity: 'high', ready: true }),
  b('ex-e4', { title: 'Mobile push notifications', issue_type: 'epic', status: 'open', milestone: 'ex-m2', points: 21, kind: 'parity', blocked: true, blocked_by: ['ex-e2'] }),
  b(LONG_ID, { title: LONG_TITLE, issue_type: 'epic', status: 'open', milestone: 'ex-m2', points: 3, labels: ['payments', 'migration', 'finance-ops-long-label'], assignee: LONG_MEMBER }),
  b('ex-e3.1', { title: 'Export CSV with every ledger column and a very long header name', parent: 'ex-e3', status: 'in_progress', assignee: 'qa', priority: 1, estimate_minutes: 90, ready: true }),
  b('ex-e3.2', { title: 'Schedule the nightly export', parent: 'ex-e3', status: 'open', priority: 3 }),
  b('ex-e3.3', { title: 'Bug: totals differ by one cent', parent: 'ex-e3', status: 'closed', issue_type: 'bug', closed_at: '2026-11-05T00:00:00Z' }),
  b('ex-e2.1', { title: 'Tune ranking weights', parent: 'ex-e2', status: 'blocked', blocked: true, blocked_by: ['ex-e3.1'], assignee: 'qa', priority: 0 }),
  b('ex-e2.2', { title: LONG_TITLE, parent: 'ex-e2', status: 'open', labels: ['a', 'b', 'c', 'd'], dependency_count: 2, comment_count: 3 }),
  b('ex-e4.1', { title: 'Register device tokens', parent: 'ex-e4', status: 'open', assignee: 'someone.else@example.com' }),
  // ex-e12: the lanes of an epic (REQ-UI-111..116): tracks with lane, track and claim, and two merge gates with waits_for
  ...e12().map((x) => b(x.id, x)),
];

const options = [
  milestoneOption('ex-m1', { title: 'Foundations', status: 'closed', start: '2026-09-28', end: '2026-10-30' }),
  milestoneOption('ex-m2', { title: 'Beta readiness for the regional launch', status: 'active', start: '2026-11-02', end: '2026-11-27' }),
  milestoneOption('ex-m3', { title: 'General availability of every regional launch, the migration cutover and the legacy decommission programme', status: 'planned', start: '2026-11-30', end: '2026-12-18' }),
];

const TODAY = '2026-11-12';
const plans = {
  'ex-m1': full(detail([epicPlan('ex-e1', { title: 'Onboarding revamp', status: 'closed', planned_start: '2026-09-28', planned_end: '2026-10-09' })], {
    id: 'ex-m1', title: 'Foundations', status: 'active', start: '2026-09-28', end: '2026-10-30', kickoff: '2026-09-28', schedule_start: '2026-09-28', today: TODAY, finish: '2026-11-06', overflow_days: 5,
  }), { lanes: 2, integration: null, deadline: null, away: {}, days_per_point: null, velocity: null }),
  'ex-m2': full(detail([
    full(epicPlan('ex-e2', { title: 'Search relevance', status: 'in_progress', planned_start: '2026-11-02', planned_end: '2026-11-13', estimate_days: 9 }), { points: 13, estimate_source: 'points', spec_confirmed: true, remaining_days: 2, actual_days: 8, actual_days_per_point: 0.6 }),
    full(epicPlan('ex-e3', { title: 'Billing exports for finance', planned_start: '2026-11-04', planned_end: '2026-11-10', estimate_days: 4, depends_on: ['ex-e2'] }), { points: 5, estimate_source: 'points', spec_confirmed: false }),
    full(epicPlan('ex-e4', { title: 'Mobile push notifications', planned_start: '2026-11-16', planned_end: '2026-11-27', estimate_days: 10, depends_on: ['ex-e3'], warnings: [{ code: 'late', days: 3, count: null }] }), { points: 21, estimate_source: 'assumed', assumed_days: 10 }),
    full(epicPlan(LONG_ID, { title: LONG_TITLE, planned_start: '2026-11-09', planned_end: '2026-12-04', estimate_days: 20, external_depends_on: [{ id: 'ex-e1', milestone: 'ex-m1' }], warnings: [{ code: 'overflow', days: 5, count: null }] }), { points: 3, estimate_source: 'days' }),
  ], { id: 'ex-m2', title: 'Beta readiness for the regional launch', status: 'active', start: '2026-11-02', end: '2026-11-27', kickoff: '2026-11-02', schedule_start: '2026-11-02', today: TODAY, finish: '2026-12-04', overflow_days: 5, description: 'Ship beta to the first regional cohort.' }),
  { lanes: 2, integration: '2026-11-20', deadline: '2026-11-27', away: { qa: ['2026-11-18'] }, days_per_point: { value: 1.4, measured_epics: 3, assumed: false }, velocity }),
  'ex-m3': full(detail([epicPlan('ex-e5', { title: 'GA hardening' })], { id: 'ex-m3', title: 'General availability', start: '2026-11-30', end: '2026-12-18', schedule_start: '2026-11-30', today: TODAY, finish: '2026-12-22' }),
  { lanes: 1, integration: null, deadline: null, away: {}, days_per_point: null, velocity: null }),
};
const milestoneList = {
  milestones: [
    full(entry('ex-m1', { title: 'Foundations', status: 'active', start: '2026-09-28', end: '2026-10-30', kickoff: '2026-09-28', finish: '2026-11-06', epics: { total: 4, closed: 3 } }), { lanes: 2, velocity: { ...velocity, say_do: 0.6, accuracy: 0.5 } }),
    full(entry('ex-m2', { title: 'Beta readiness for the regional launch', status: 'active', start: '2026-11-02', end: '2026-11-27', kickoff: '2026-11-02', finish: '2026-12-04', epics: { total: 6, closed: 2 }, warnings: 2 }), { lanes: 2, velocity }),
    full(entry('ex-m3', { title: 'General availability', status: 'planned', start: '2026-11-30', end: '2026-12-18', finish: '2026-12-22' }), { lanes: 1, velocity: null }),
  ],
  unassigned_epics: 1, today: TODAY,
  forecast: { deadline: '2026-12-31', lanes: 2, start: '2026-11-08', finish: '2026-12-23', overflow_days: 0, open_epics: 5, unestimated: 1, error: null },
  days_per_point: { value: 1.4, measured_epics: 3, assumed: false },
};

const report = {
  generated_at: '2026-11-12T10:00:00Z', project: 'example', days: 30, sprint: null,
  totals: { closed: 4, rework_rate: 0.25 },
  delivery: {
    weeks: [{ week: '2026-W44', counts: { task: 3, bug: 1, epic: 1 } }, { week: '2026-W45', counts: { task: 5, feature: 2 } }],
    by_type: [{ key: 'task', cycle: { n: 5, median: 1.5, p85: 3 }, lead: { n: 5, median: 3, p85: 6 } }],
    by_member: [{ key: LONG_MEMBER, cycle: { n: 5, median: 1.5, p85: 3 }, lead: null }],
    overall: { key: 'all', cycle: { n: 9, median: 2, p85: 4 }, lead: { n: 9, median: 4, p85: 8 } },
    estimates: [{ project: 'example', id: 'ex-e2', title: LONG_TITLE, estimate_days: 9, points: 13, actual_days: 8, days_per_point: 0.6 }],
  },
  quality: {
    members: [{ member: LONG_MEMBER, closed: 4, reopens: 1, bugs: 1, rework_rate: 0.25 }],
    epics: [{ project: 'example', id: LONG_ID, title: LONG_TITLE, closed: 4, reopens: 1, bugs: 1, rework_rate: 0.5 }],
  },
  errors: [],
};
const figures = { scope: 4, closed: 1, in_progress: 1, open: 2, blocked: 1, unclaimed: 1, done: 0.25, throughput: 1, cycle_median: 1.5, oldest_in_progress: 4, on_time: 1, rework_rate: 0.1, reopens: 1, bugs: 1 };
const tb = (id: string, o: object) => ({
  id, title: LONG_TITLE, issue_type: 'task', status: 'open', bucket: 'open', assignee: LONG_MEMBER, priority: 2, created_at: '2026-11-02T09:00:00Z',
  epic: { id: LONG_ID, title: LONG_TITLE }, started_at: null, closed_at: null, cycle_days: null, age_days: null, late_days: null, rework: 0, ...o,
});
const team = {
  generated_at: '2026-11-12T10:00:00Z', project: 'example', today: TODAY,
  milestones: options.map((m) => ({ ...m, closed_on: m.status === 'closed' ? '2026-11-03' : null })), undated: 0, milestone: 'ex-m2',
  team: { ...figures, working_days: 20, elapsed: 9, days_left: 11, pace: 3.6, pace_needed: 5.2, late_open: 2 },
  members: [{ ...figures, member: LONG_MEMBER }, { ...figures, member: 'qa', scope: 3 }, { ...figures, member: 'Unassigned', closed: 0 }],
  days: [{ date: '2026-11-10', closed: { [LONG_MEMBER]: 2, qa: 1 } }, { date: '2026-11-11', closed: {} }, { date: '2026-11-12', closed: { qa: 3 } }],
  beads: [
    tb('ex-e3.1', {}), tb('ex-e2.1', { status: 'in_progress', bucket: 'in_progress', started_at: '2026-11-08T09:00:00Z', age_days: 4, late_days: 2 }),
    tb('ex-e3.3', { status: 'closed', bucket: 'closed', started_at: '2026-11-09T09:00:00Z', closed_at: '2026-11-10T09:00:00Z', cycle_days: 1, rework: 2, assignee: 'qa' }),
  ],
};
const comments = [
  { id: 'c1', author: 'qa', created_at: '2026-10-30T10:00:00Z', truncated: false, text: '[gin close] ex-m1\nDelivered: onboarding revamp and the long tail of follow-ups\nSpillover: billing exports\nOutcome: shipped\nMetrics: say/do 0.6' },
  { id: 'c2', author: LONG_MEMBER, created_at: '2026-10-31T10:00:00Z', truncated: true, text: `[gin retro] ex-m1 ${LONG_MEMBER}\nWent well: pairing on the migration\nSlowed us: ${LONG_TITLE}\nChange next: smaller epics` },
  { id: 'c3', author: 'qa', created_at: '2026-11-02T10:00:00Z', truncated: false, text: 'A plain comment' },
];
const detailOf = (id: string) => {
  const s = beads.find((x) => x.id === id) ?? beads[2];
  return full(s, {
    description: 'Export every ledger row.\n\n- one\n- two with `code`\n\nPR opened: https://github.com/Qwikfoneoffice/QwikFone_Office_Backend/pull/263 (branch fix/long-name)\n\n| column one | column two | column three | column four | column five | column six | column seven | column eight |\n|---|---|---|---|---|---|---|---|\n| value number one | value number two | value number three | value number four | value number five | value number six | value number seven | value number eight |', design: 'Stream rows.', notes: 'See the finance runbook.', acceptance_criteria: 'Totals match.', close_reason: null,
    dependencies: [{ id: 'ex-e2', title: 'Search relevance', status: 'in_progress', type: 'blocks' }],
    dependents: [{ id: 'ex-e4', title: LONG_TITLE, status: 'open', type: 'blocks' }],
    children: beads.filter((x) => x.parent === s.id).map((c) => ({ id: c.id, title: c.title, status: c.status, type: 'parent-child', prep: false })),
    bugs: [{ id: 'ex-e3.3', title: 'Bug: totals differ by one cent', status: 'closed', type: 'discovered-from' }],
  });
};

async function stub(page: Page): Promise<string[]> {
  const unstubbed: string[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let body: unknown = { error: 'not stubbed' };
    let status = 404;
    const ok = (value: unknown) => { body = value; status = 200; };
    const p = url.pathname;
    if (p === '/api/projects/beads') {
      const beadsOf = { open: 5, in_progress: 2, blocked: 1, ready: 2, prep: 0, epics: [{ id: LONG_ID, title: LONG_TITLE }, { id: 'ex-e2', title: 'Search relevance' }] };
      ok(['example', 'qwikfone'].map((name) => ({ name, path: `/home/gin/${name}`, exists: true, workflow: null, beads: beadsOf })));
    } else if (p === '/api/beads/milestones') ok({ milestones: options, current: 'ex-m2' });
    else if (p === '/api/milestones') ok(milestoneList);
    else if (parts[1] === 'beads' && parts[4] === 'workflow') ok({ stage: 'execute', gates: { plan_approved: 'satisfied', reviewed: 'unmet' }, warnings: [LONG_TITLE], review_waivers: [{ task_id: 'ex-e12.2', reason: LONG_TITLE, actor: LONG_MEMBER }] });
    else if (parts[1] === 'milestones' && parts.length === 4) {
      const plan = plans[parts[3] as keyof typeof plans];
      if (plan) ok(plan);
    } else if (p === '/api/beads') ok(url.searchParams.get('closed') === '1' ? beads : beads.filter((x) => x.status !== 'closed'));
    else if (parts[1] === 'beads' && parts[4] === 'comments') ok(comments);
    else if (parts[1] === 'beads' && parts.length === 4 && beads.some((x) => x.id === parts[3])) ok(detailOf(parts[3]));
    else if (p === '/api/reports/team') ok(team);
    else if (p === '/api/reports') ok(report);
    if (status === 404 && body && (body as { error?: string }).error === 'not stubbed') unstubbed.push(url.pathname);
    await route.fulfill({ status, json: body });
  });
  return unstubbed;
}

type Visit = { name: string; url: string; ready: (page: Page) => Promise<void>; after?: (page: Page) => Promise<void> };
const text = (t: string | RegExp) => async (page: Page) => { await expect(page.getByText(t).first()).toBeVisible(); };
const heading = (name: string | RegExp) => async (page: Page) => { await expect(page.getByRole('heading', { name }).first()).toBeVisible(); };
const scrollGantt = (to: number) => async (page: Page) => {
  await page.locator('[data-scroller]').first().evaluate((el, f) => { el.scrollLeft = (el.scrollWidth - el.clientWidth) * f; }, to);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
};
const beadsView = (view: string): Visit => ({ name: `beads ${view}`, url: `/beads?project=example&milestone=all&view=${view}`, ready: text(/\d+ of \d+/) });
const loaded = async (page: Page) => {
  await expect(page.getByRole('tabpanel').first()).toBeVisible();
  await expect(page.getByText(/^Loading/)).toHaveCount(0);
};
const report_ = (tab: string): Visit => ({ name: `reports ${tab}`, url: `/reports?project=example&tab=${tab}`, ready: loaded });
const gantt = (zoom: string): Visit => ({ name: `gantt ${zoom}`, url: `/milestones/example/ex-m2?tab=gantt&zoom=${zoom}`, ready: async (page) => { await expect(page.locator('[data-scroller]').first()).toBeVisible(); await expect(page.getByText(/^Loading/)).toHaveCount(0); } });

const groups: Record<string, Visit[]> = {
  'beads views': ['list', 'board', 'focus', 'graph'].map(beadsView),
  'beads lanes': [
    { name: 'beads lanes', url: '/beads?project=example&milestone=all&view=lanes&scope=ex-e12', ready: async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); } },
    { name: 'beads graph lanes', url: '/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1', ready: async (page) => { await expect(page.locator('section[data-lane]').first()).toBeVisible(); await expect(page.locator('[data-chip]').first()).toBeVisible(); } },
    { name: 'bead lane track', url: '/beads/example/ex-e12.2', ready: heading('Track 2') },
    { name: 'bead merge gate', url: '/beads/example/ex-e12.9', ready: heading(/Waits for be #2 to merge/) },
  ],
  'beads with a panel': [
    { name: 'beads list panel', url: '/beads?project=example&milestone=all&view=list&select=ex-e3', ready: text('Billing exports for finance') },
    { name: 'beads board panel', url: '/beads?project=example&milestone=all&view=board&select=ex-e3', ready: text('Billing exports for finance') },
    { name: 'beads graph panel', url: '/beads?project=example&milestone=all&view=graph&select=ex-e3', ready: text('Billing exports for finance') },
  ],
  'bead pages': [
    { name: 'bead epic', url: '/beads/example/ex-e3', ready: heading(/Billing exports/) },
    { name: 'bead long id', url: `/beads/example/${LONG_ID}`, ready: heading(/Payments provider migration/) },
    { name: 'bead task', url: '/beads/example/ex-e3.1', ready: heading(/Export CSV/) },
    // REQ-UI-119..122: the epic page of ex-e12 on Overview, on Graph with closed tracks and on Lanes
    { name: 'epic overview', url: '/beads/example/ex-e12', ready: async (page) => { await expect(page.getByRole('region', { name: 'Tracks' })).toBeVisible(); await expect(page.getByRole('region', { name: 'Lanes' })).toBeVisible(); await expect(page.getByText(/^Loading/)).toHaveCount(0); } },
    { name: 'epic graph', url: '/beads/example/ex-e12?tab=graph&closed=1', ready: async (page) => { await expect(page.locator('section[data-lane]').first()).toBeVisible(); await expect(page.locator('[data-chip]').first()).toBeVisible(); } },
    { name: 'epic lanes', url: '/beads/example/ex-e12?tab=lanes', ready: async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); } },
  ],
  'my tasks': [{ name: 'my tasks', url: '/my-tasks?project=example', ready: async (page) => { await expect(page.getByRole('link', { name: /Search relevance/ }).first()).toBeVisible(); } }],
  milestones: [{ name: 'milestones', url: '/milestones?project=example', ready: text('General availability') }],
  'gantt 1w and 2w': ['1w', '2w'].map(gantt),
  'gantt all and scrolled': [
    gantt('all'),
    { ...gantt('1w'), name: 'gantt 1w scrolled middle', after: scrollGantt(0.5) },
    { ...gantt('2w'), name: 'gantt 2w scrolled end', after: scrollGantt(1) },
    { ...gantt('all'), name: 'gantt all past end', url: '/milestones/example/ex-m1?tab=gantt&zoom=all' },
  ],
  'milestone tabs': [
    { name: 'milestone beads', url: '/milestones/example/ex-m2?tab=beads', ready: text('Billing exports for finance') },
    { name: 'milestone retro', url: '/milestones/example/ex-m1?tab=retro', ready: text('Went well') },
  ],
  'reports team and delivery': [report_('team'), report_('delivery')],
  'reports velocity and quality': [report_('velocity'), report_('quality')],
};

const show = (findings: Finding[]) => findings.map((f) => `${f.kind}: "${f.text}"${f.other ? ` x "${f.other}"` : ''}\n    ${f.selector}\n    ${f.detail}`).join('\n');

for (const [group, visits] of Object.entries(groups)) {
  test(`REQ-UI-110: ${group} are readable at every width and theme`, async ({ page, ev }) => {
    void ev; // signs in (REQ-UI-097)
    test.setTimeout(240_000);
    await page.addInitScript(() => { if (!localStorage.getItem('gin-console-theme')) localStorage.setItem('gin-console-theme', 'light'); });
    const unstubbed = await stub(page);
    const failures: string[] = [];
    for (const visit of visits) {
      for (const size of WIDTHS) {
        await page.setViewportSize(size);
        await page.goto(visit.url);
        await visit.ready(page);
        for (const theme of THEMES) {
          if (theme === 'dark') {
            await page.evaluate(() => localStorage.setItem('gin-console-theme', 'dark'));
            await page.reload();
            await visit.ready(page);
              }
          await visit.after?.(page);
          const findings = await readabilityFindings(page);
          if (findings.length) failures.push(`${visit.name} @${size.width} ${theme}: ${findings.length} finding(s)\n${show(findings)}`);
        }
        await page.evaluate(() => localStorage.setItem('gin-console-theme', 'light'));
      }
    }
    expect([...new Set(unstubbed)], 'API calls the spec does not stub').toEqual([]);
    expect(failures, failures.join('\n\n')).toEqual([]);
  });
}

test('REQ-UI-110 REQ-UI-107: a wide table scrolls in its own box while a long URL wraps', async ({ page, ev }) => {
  void ev;
  await stub(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/beads/example/ex-e3.1');
  await expect(page.locator('.markdown table').first()).toBeVisible();
  const m = await page.evaluate(() => {
    const t = document.querySelector('.markdown table') as HTMLElement;
    return { overflows: t.scrollWidth > t.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(m.overflows).toBe(true);
  expect(m.page).toBeLessThanOrEqual(0);
  expect(await readabilityFindings(page)).toEqual([]);
});
