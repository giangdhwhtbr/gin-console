// TC: TC-REPORTS-040@b6f50eb9
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-REPORTS-040: Retired all-projects link (REQ-REPORTS-017)', async ({ page, ev }) => {
  // Precondition: the current project is alpha, the only configured project.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports/team?project=all`', async () => {
    await page.goto('/reports/team?project=all');
    await expect(page).toHaveURL((url) => url.pathname === '/reports/team' && url.searchParams.get('project') === 'alpha');
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toBeVisible();
    const team = stub.calls.filter((url) => url.pathname === '/api/reports/team');
    expect(team.length).toBeGreaterThan(0);
    expect(team.every((url) => url.searchParams.get('project') === 'alpha')).toBe(true);
    expect(stub.calls.some((url) => url.searchParams.get('project') === 'all')).toBe(false);
  });
});
