// TC: TC-REPORTS-051@e560bd9a
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

const LONG_TITLE = 'Payments platform migration '.repeat(5).slice(0, 120);
const LONG_MEMBER = 'nguyen.thi.thanh.huong.payments-team@example-company.com.vn';

const figures = {
  scope: 4, closed: 1, in_progress: 1, open: 2, blocked: 0, unclaimed: 0, done: 0.25, throughput: 1,
  cycle_median: 1.5, oldest_in_progress: 4, on_time: 1, rework_rate: 0, reopens: 0, bugs: 0,
};

test('TC-REPORTS-051: Long options on a phone', async ({ page, ev }) => {
  // Precondition: project alpha has a 120-character milestone title and a long member; the window is 390px wide.
  expect(LONG_TITLE).toHaveLength(120);
  await page.setViewportSize({ width: 390, height: 800 });
  await stubApi(page, { projects: ['alpha'] });
  await page.route('**/api/reports/team**', (route) =>
    route.fulfill({
      json: {
        generated_at: '2026-11-12T10:00:00Z', project: 'alpha', today: '2026-11-12',
        milestones: [{ id: 'm2', title: LONG_TITLE, status: 'active', start: '2026-11-02', end: '2026-11-27', closed_on: null }],
        undated: 0, milestone: 'm2',
        team: { ...figures, working_days: 20, elapsed: 9, days_left: 11, pace: 3.6, pace_needed: 3.4, late_open: 0 },
        members: [{ ...figures, member: LONG_MEMBER }],
        days: [{ date: '2026-11-12', closed: { [LONG_MEMBER]: 1 } }],
        beads: [{
          id: 'a-1', title: 'Bead', issue_type: 'task', status: 'closed', bucket: 'closed', assignee: LONG_MEMBER, priority: 2,
          created_at: '2026-11-02T09:00:00Z', epic: { id: 'a-e1', title: 'Epic one' }, started_at: '2026-11-09T09:00:00Z',
          closed_at: '2026-11-10T09:00:00Z', cycle_days: 1, age_days: null, late_days: null, rework: null,
        }],
      },
    }),
  );
  await page.route(/\/api\/reports\?/, (route) =>
    route.fulfill({
      json: {
        generated_at: '2026-11-12T10:00:00Z', project: 'alpha', days: 30, sprint: null,
        totals: { tokens: 0, cost: null, closed: 0, tokens_per_bead: null, cache_ratio: null, rework_rate: null },
        usage: { members: [], epics: [], beads: [], stages: [], models: [] },
        delivery: { weeks: [], by_type: [], by_member: [], overall: { key: 'all', cycle: null, lead: null }, estimates: [] },
        quality: { members: [], epics: [], points: [] },
        coverage: { not_collected: [], invalid: [], unpriced: [], unassigned_share: null, sources: [] },
        errors: [],
      },
    }),
  );

  await ev.step('1. Open `/reports?project=alpha&tab=team`', async () => {
    await page.goto('/reports?project=alpha&tab=team');
    const milestone = page.getByRole('combobox', { name: 'Milestone' });
    const member = page.getByRole('combobox', { name: 'Member' });
    await expect(milestone).toBeVisible();
    await expect(member).toBeVisible();
    await expect(milestone).toContainText(LONG_TITLE);
    await expect(member.locator('option', { hasText: LONG_MEMBER })).toHaveCount(1);
    for (const select of [milestone, member]) {
      const box = await select.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  });
});
