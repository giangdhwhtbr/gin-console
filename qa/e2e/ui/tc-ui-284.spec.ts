// TC: TC-UI-284@875d0e05
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-UI-284: Late milestone headline', async ({ page, ev }) => {
  // Precondition: open milestone m2 (2 Nov - 27 Nov 2026), 27 of 64 closed, forecast finish 15 Dec 2026; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    team: { closed: 27, scope: 64, pace: 3.6, paceNeeded: 3.4 },
    milestones: list([entry('m2', { title: 'Second', status: 'active', start: '2026-11-02', end: '2026-11-27', finish: '2026-12-15' })]),
  });

  await ev.step('1. Open `/reports?project=alpha`', async () => {
    await page.goto('/reports?project=alpha');
    const team = page.getByRole('tab', { name: /^Team/ });
    await expect(team).toContainText('27 of 64 done, late');
    await expect(team.locator('svg')).toHaveCount(1);
  });
});
