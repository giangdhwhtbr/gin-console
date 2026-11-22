// TC: TC-REPORTS-070@51012cb5
// TC: TC-REPORTS-070@x
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-070: Open and rework figures read as sentences', async ({ page, ev }) => {
  // Precondition: the team report of m2 has blocked 3, unclaimed 8, reopens 2 and bugs 1.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page);
  await page.route('**/api/reports/team**', (route) => {
    const body = teamBody('alpha');
    return route.fulfill({
      json: { ...body, team: { ...body.team, scope: 20, open: 12, blocked: 3, unclaimed: 8, reopens: 2, bugs: 1, rework_rate: 0.1 } },
    });
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /reports?project=alpha&tab=team&milestone=m2', async () => {
    await page.goto('/reports?project=alpha&tab=team&milestone=m2');
    const figures = page.getByRole('group', { name: 'Key figures' });
    const open = figures.getByText('3 blocked, 8 unassigned', { exact: true });
    await expect(open).toBeVisible();
    await expect(open).toHaveClass(/text-state-blocked/);
    await expect(figures.getByText('2 reopens, 1 bug later', { exact: true })).toBeVisible();
  });
});
