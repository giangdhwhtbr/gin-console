// TC: TC-UI-018@3735c036
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-018: Old link for all projects (REQ-UI-088)', async ({ page, ev }) => {
  // Preconditions: the current project is alpha; the URL is /reports/delivery?project=all&days=7.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports/delivery?project=all&days=7`', async () => {
    await page.goto('/reports/delivery?project=all&days=7');
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/reports/delivery?project=alpha&days=7');
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toHaveValue('days:7');
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveCount(0);
    await expect.poll(() => stub.calls.some((u) => u.pathname === '/api/reports' && u.searchParams.get('project') === 'alpha' && u.searchParams.get('days') === '7')).toBe(true);
    expect(stub.calls.some((u) => u.pathname === '/api/reports' && u.searchParams.get('project') === 'all')).toBe(false);
  });
});
