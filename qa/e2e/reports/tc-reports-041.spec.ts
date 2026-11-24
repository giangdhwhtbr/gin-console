// TC: TC-REPORTS-041@a50806c0
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-041: No milestones (REQ-REPORTS-017)', async ({ page, ev }) => {
  // Precondition: the team report of beta has no milestones.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['beta'] });
  await page.route('**/api/reports/team**', (route) =>
    route.fulfill({ json: { ...teamBody('beta', { periodDays: 30 }), milestones: [], milestone: null, members: [], days: [], beads: [] } }),
  );

  await ev.step('1. Open `/reports/team?project=beta`', async () => {
    await page.goto('/reports/team?project=beta');
    await expect(page).toHaveURL((url) => url.pathname === '/reports/team' && url.searchParams.get('project') === 'beta' && url.searchParams.get('days') === '30');
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toHaveValue('days:30');
    await expect(page.getByRole('region', { name: 'Team' }).getByRole('heading', { name: /Last 30 days/ })).toBeVisible();
  });
});
