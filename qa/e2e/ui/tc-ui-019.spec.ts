// TC: TC-UI-019@3aa9d072
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-019: Change period (REQ-UI-088)', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha, 30 days and the Delivery tab.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubReports(page, { projects: ['alpha'] });
  const reports = () => stub.calls.filter((u) => u.pathname === '/api/reports');

  await ev.step('1. Open `/reports?project=alpha&days=30&tab=delivery`', async () => {
    await page.goto('/reports?project=alpha&days=30&tab=delivery');
    await expect(page.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => reports().length).toBe(1);
  });

  await ev.step('2. Pick 90 days', async () => {
    await page.evaluate(() => Object.assign(window, { stillHere: true }));
    await page.getByRole('button', { name: '90 days' }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/reports?project=alpha&days=90&tab=delivery');
    await expect.poll(() => reports().some((u) => u.searchParams.get('days') === '90')).toBe(true);
    expect(await page.evaluate(() => 'stillHere' in window)).toBe(true);
  });
});
