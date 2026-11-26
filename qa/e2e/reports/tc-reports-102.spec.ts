// TC: TC-REPORTS-102@6e67ee2f
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-REPORTS-102: Project without bugs (REQ-REPORTS-044)', async ({ page, ev }) => {
  // Precondition: beta has beads and no bug (figures.total is 0).
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubReports(page, {
    projects: ['beta'],
    bugs: {
      figures: { total: 0, opened: 0, closed: 0, open_now: 0, oldest_open_days: null, median_close_days: null },
      weeks: [], epics: [], open: [],
    },
  });

  await ev.step('1. Open `/reports/bugs?project=beta&days=30`', async () => {
    await page.goto('/reports/bugs?project=beta&days=30');
    const panel = page.getByRole('region', { name: 'Bugs', exact: true });
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toBeVisible();
    await expect(panel.getByText('No bugs in beta')).toBeVisible();
    await expect(panel.getByRole('definition')).toHaveCount(0);
    for (const name of ['Bugs per week', 'Bugs by epic', 'Open bugs']) {
      await expect(page.getByRole('heading', { name })).toHaveCount(0);
    }
    await expect(page.getByRole('link', { name: /^Bugs/ })).toContainText('No open bugs');
  });
});
