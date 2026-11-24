// TC: TC-REPORTS-069@15000ecb
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-069: Milestone line shows status, period and working days', async ({ page, ev }) => {
  // Precondition: alpha has active m2 of 16 working days, today being its day 8, with a forecast finish after its end.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, {
    projects: ['alpha'],
    milestones: list([entry('m2', { title: 'Second', status: 'active', start: '2026-11-02', end: '2026-11-25', finish: '2026-12-22' })], { today: '2026-11-12' }),
  });
  await page.route('**/api/reports/team**', (route) => {
    const body = teamBody('alpha');
    return route.fulfill({
      json: {
        ...body, today: '2026-11-12',
        milestones: [{ id: 'm2', title: 'Second', status: 'active', start: '2026-11-02', end: '2026-11-25', closed_on: null }],
        team: { ...body.team, working_days: 16, elapsed: 8, days_left: 8 },
      },
    });
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/reports/team?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/team?project=alpha&milestone=m2');
    const line = page.getByRole('heading', { name: 'Second' }).locator('xpath=..');
    await expect(line).toBeVisible();
    const status = line.locator('[data-milestone-status]');
    await expect(status).toHaveText('Active, late');
    await expect(status.locator('svg[data-glyph="in_progress"]')).toHaveCount(1);
    await expect(status.locator('svg.lucide-triangle-alert')).toBeVisible();
    await expect(status).toHaveClass(/text-state-blocked/);
    await expect(line).toContainText('2 Nov – 25 Nov');
    await expect(line.getByText('working day 8 of 16, 8 left', { exact: true })).toBeVisible();
  });
});
