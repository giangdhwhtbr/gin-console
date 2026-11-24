// TC: TC-REPORTS-051@0f0a696f
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

const LONG_TITLE = 'Payments platform migration '.repeat(5).slice(0, 120);
const LONG_MEMBER = 'nguyen.thi.thanh.huong.payments-team@example-company.com.vn';

test('TC-REPORTS-051: Long options on a phone', async ({ page, ev }) => {
  // Precondition: project alpha has a 120-character milestone title and a long member; the window is 390px wide.
  expect(LONG_TITLE).toHaveLength(120);
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 390, height: 800 });
  await stubReports(page, { projects: ['alpha'] });
  await page.route('**/api/reports/team**', (route) => {
    const base = teamBody('alpha');
    return route.fulfill({
      json: {
        ...base,
        milestones: [{ id: 'm2', title: LONG_TITLE, status: 'active', start: '2026-11-02', end: '2026-11-27', closed_on: null }],
        members: [{ ...base.team, member: LONG_MEMBER }],
        days: [{ date: '2026-11-12', closed: { [LONG_MEMBER]: 1 } }],
        beads: [{
          id: 'a-1', title: 'Bead', issue_type: 'task', status: 'closed', bucket: 'closed', blocked: false, assignee: LONG_MEMBER, priority: 2,
          created_at: '2026-11-02T09:00:00Z', epic: { id: 'a-e1', title: 'Epic one' }, started_at: '2026-11-09T09:00:00Z',
          closed_at: '2026-11-10T09:00:00Z', cycle_days: 1, age_days: null, late_days: null, rework: 0,
        }],
      },
    });
  });

  await ev.step('1. Open `/reports/team?project=alpha`', async () => {
    await page.goto('/reports/team?project=alpha');
    const scope = page.getByRole('combobox', { name: 'Report scope' });
    const member = page.getByRole('combobox', { name: 'Member' });
    await expect(scope).toBeVisible();
    await expect(member).toBeVisible();
    await expect(scope).toContainText(LONG_TITLE);
    await expect(member.locator('option', { hasText: LONG_MEMBER })).toHaveCount(1);
    for (const select of [scope, member]) {
      const box = await select.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  });
});
