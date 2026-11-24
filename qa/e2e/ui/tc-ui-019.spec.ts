// TC: TC-UI-019@3abe44c2
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-019: Change period (REQ-UI-088)', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha, 30 days and the Delivery section.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubReports(page, { projects: ['alpha'] });
  const reports = () => stub.calls.filter((u) => u.pathname === '/api/reports');
  const scope = page.getByRole('combobox', { name: 'Report scope' });

  await ev.step('1. Open `/reports/delivery?project=alpha&days=30`', async () => {
    await page.goto('/reports/delivery?project=alpha&days=30');
    await expect(scope).toHaveValue('days:30');
    await expect.poll(() => reports().length).toBe(1);
  });

  await ev.step('2. Pick "Last 90 days" in the scope select', async () => {
    await page.evaluate(() => Object.assign(window, { stillHere: true }));
    await scope.selectOption('days:90');
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/reports/delivery?project=alpha&days=90');
    await expect.poll(() => reports().some((u) => u.searchParams.get('days') === '90')).toBe(true);
    expect(await page.evaluate(() => 'stillHere' in window)).toBe(true);
  });
});
