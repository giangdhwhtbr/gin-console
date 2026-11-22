// TC: TC-MILESTONE-UI-108@8b0ca046
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports, teamBody } from '../support/reports';

test('TC-MILESTONE-UI-108: Past the end without a forecast', async ({ page, ev }) => {
  // Precondition: P has active m2 ending 20 Nov 2026 with no forecast finish; the browser clock is 21 Nov 2026.
  await page.clock.install({ time: new Date('2026-11-21T09:00:00') });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, {
    projects: ['P'],
    milestones: list([entry('m2', { title: 'Second', status: 'active', start: '2026-11-02', end: '2026-11-20', finish: null })], { today: '2026-11-21' }),
  });
  await page.route('**/api/reports/team**', (route) => {
    const body = teamBody('P');
    return route.fulfill({
      json: { ...body, today: '2026-11-21', milestones: [{ ...body.milestones[0], end: '2026-11-20' }] },
    });
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /reports?project=P&tab=team', async () => {
    await page.goto('/reports?project=P&tab=team');
    const status = page.locator('[data-milestone-status]');
    await expect(status).toHaveText('Active, late');
    await expect(status.locator('svg.lucide-triangle-alert')).toBeVisible();
  });
});
