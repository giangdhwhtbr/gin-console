// TC: TC-REPORTS-041@b5c38bae
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-041: No milestones (REQ-REPORTS-017)', async ({ page, ev }) => {
  // Precondition: the team report of beta has no milestones.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['beta'] });
  await page.route('**/api/reports/team**', (route) =>
    route.fulfill({ json: { ...teamBody('beta'), milestones: [], milestone: null, members: [], days: [], beads: [] } }),
  );

  await ev.step('1. Open `/reports?project=beta&tab=team`', async () => {
    await page.goto('/reports?project=beta&tab=team');
    await expect(page.getByText('beta has no milestones yet')).toBeVisible();
    await expect(page.getByText('gin milestone create', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  });
});
