// TC: TC-MILESTONE-UI-110@d7ac88ee
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports, teamBody } from '../support/reports';

test('TC-MILESTONE-UI-110: Behind pace is not late', async ({ page, ev }) => {
  // Precondition: P has active milestone m5 ending 11 Dec 2026, forecast finish 10 Dec 2026, pace 2.0, pace_needed 3.4; the clock is 21 Nov 2026.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.clock.setFixedTime(new Date('2026-11-21T10:00:00Z'));
  await stubReports(page, {
    projects: ['P'],
    milestones: list([entry('m5', { status: 'active', start: '2026-11-02', end: '2026-12-11', finish: '2026-12-10' })], { today: '2026-11-21' }),
  });
  await page.route('**/api/reports/team**', (route) => {
    const body = teamBody('P', { closed: 27, scope: 64, pace: 2.0, paceNeeded: 3.4 });
    return route.fulfill({
      json: {
        ...body, today: '2026-11-21', milestone: 'm5',
        milestones: [{ id: 'm5', title: 'Title m5', status: 'active', start: '2026-11-02', end: '2026-12-11', closed_on: null }],
      },
    });
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /reports?project=P&tab=team&milestone=m5', async () => {
    await page.goto('/reports?project=P&tab=team&milestone=m5');
    await expect(page.getByRole('link', { name: /^Team/ })).toContainText('behind pace');
    await expect(page.locator('main')).not.toContainText(/\blate\b/i);
  });
});
