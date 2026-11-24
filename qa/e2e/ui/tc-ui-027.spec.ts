// TC: TC-UI-027@58d658ea
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-027: Change section', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha, 90 days and the Delivery section; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, { projects: ['alpha'] });
  const reports = () => stub.calls.filter((u) => u.pathname === '/api/reports');

  await page.goto('/reports/delivery?project=alpha&days=90');
  await expect(page.getByRole('link', { name: /^Delivery/ })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => reports().length).toBe(1);

  await ev.step('1. Open the Rework section', async () => {
    await page.evaluate(() => Object.assign(window, { stillHere: true }));
    await page.getByRole('link', { name: /^Rework/ }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/reports/rework?project=alpha&days=90');
    await expect(page.getByRole('link', { name: /^Rework/ })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => 'stillHere' in window)).toBe(true);
    expect(reports()).toHaveLength(1);
  });
});
