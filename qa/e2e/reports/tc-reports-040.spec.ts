// TC: TC-REPORTS-040@201409fc
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-REPORTS-040: Retired all-projects link (REQ-REPORTS-017)', async ({ page, ev }) => {
  // Precondition: the current project is alpha, the only configured project.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=all&tab=team`', async () => {
    await page.goto('/reports?project=all&tab=team');
    await expect(page).toHaveURL((url) => url.pathname === '/reports' && url.searchParams.get('project') === 'alpha' && url.searchParams.get('tab') === 'team');
    await expect(page.getByRole('combobox', { name: 'Milestone' })).toBeVisible();
    const team = stub.calls.filter((url) => url.pathname === '/api/reports/team');
    expect(team.length).toBeGreaterThan(0);
    expect(team.every((url) => url.searchParams.get('project') === 'alpha')).toBe(true);
    expect(stub.calls.some((url) => url.searchParams.get('project') === 'all')).toBe(false);
  });
});
