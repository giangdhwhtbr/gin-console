// TC: TC-UI-027@c5b9ac04
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-027: Change tab', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha, 90 days and the Delivery tab; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, { projects: ['alpha'] });
  const reports = () => stub.calls.filter((u) => u.pathname === '/api/reports');

  await page.goto('/reports?project=alpha&days=90&tab=delivery');
  await expect(page.getByRole('tab', { name: /^Delivery/ })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => reports().length).toBe(1);

  await ev.step('1. Pick the Quality tab', async () => {
    await page.evaluate(() => Object.assign(window, { stillHere: true }));
    await page.getByRole('tab', { name: /^Quality/ }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/reports?project=alpha&days=90&tab=quality');
    await expect(page.getByRole('tab', { name: /^Quality/ })).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => 'stillHere' in window)).toBe(true);
    expect(reports()).toHaveLength(1);
  });
});
