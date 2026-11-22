// TC: TC-REPORTS-060@550221ad
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';
import { reportBody, teamBody } from '../support/reports';

test('TC-REPORTS-060: Late active milestone', async ({ page, ev }) => {
  // Preconditions: alpha has active m2 whose forecast finish is after its end.
  await page.clock.setFixedTime(new Date('2026-11-21T09:00:00'));
  const m2 = entry('m2', { title: 'Checkout v2', status: 'active', start: '2026-11-10', end: '2026-12-01', finish: '2027-02-16' });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['alpha'], milestones: list([m2], { today: '2026-11-21' }) });
  await page.route('**/api/reports/team**', (route) => {
    const body = teamBody('alpha');
    return route.fulfill({
      json: {
        ...body, today: '2026-11-21',
        milestones: [{ id: 'm2', title: 'Checkout v2', status: 'active', start: '2026-11-10', end: '2026-12-01', closed_on: null }],
        milestone: 'm2',
      },
    });
  });
  await page.route(/\/api\/reports\?/, (route) => route.fulfill({ json: reportBody('alpha') }));

  await ev.step('1. Open `/reports?project=alpha&tab=team&milestone=m2`', async () => {
    await page.goto('/reports?project=alpha&tab=team&milestone=m2');
  });

  await ev.step('2. Look at the status in the milestone line', async () => {
    const chip = page.locator('[data-milestone-status]');
    await expect(chip).toHaveText('Active, late');
    await expect(chip.locator('svg.lucide-triangle-alert')).toBeVisible();
  });
});
