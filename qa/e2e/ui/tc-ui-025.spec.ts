// TC: TC-UI-025@ece75622
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-025: Shared link (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the URL /reports/rework?project=alpha&days=7; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports/rework?project=alpha&days=7`', async () => {
    await page.goto('/reports/rework?project=alpha&days=7');
    await expect(page.getByRole('link', { name: /^Rework/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toHaveValue('days:7');
    await expect.poll(() => stub.calls.some((u) => u.pathname === '/api/reports' && u.searchParams.get('project') === 'alpha' && u.searchParams.get('days') === '7')).toBe(true);
  });
});
