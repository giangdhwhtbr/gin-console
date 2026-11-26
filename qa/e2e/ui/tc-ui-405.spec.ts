// TC: TC-UI-405@24a9c86b
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-405: Bugs section and headline (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: alpha has a bugs report with open_now 25 and a rework report; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, {
    projects: ['alpha'],
    bugs: { figures: { total: 30, opened: 13, closed: 11, open_now: 25, oldest_open_days: 43, median_close_days: 0.5 } },
  });
  const strip = page.getByRole('navigation', { name: 'Report sections' });
  const bugsRequests = () => stub.calls.filter((u) => u.pathname === '/api/reports/bugs');

  await ev.step('1. Open `/reports/rework?project=alpha&days=30`', async () => {
    await page.goto('/reports/rework?project=alpha&days=30');
    const links = strip.getByRole('link');
    await expect(links).toHaveCount(6);
    for (const [i, name] of ['Status', 'Team', 'Delivery', 'Velocity', 'Rework', 'Bugs'].entries()) {
      await expect(links.nth(i)).toContainText(name);
    }
    const bugs = strip.getByRole('link', { name: /^Bugs/ });
    await expect(bugs).toContainText('25 open bugs');
    await expect(bugs.locator('svg.lucide-triangle-alert')).toHaveCount(0);
    await expect.poll(() => bugsRequests().length).toBe(1);
  });

  await ev.step('2. Open the Bugs section', async () => {
    await strip.getByRole('link', { name: /^Bugs/ }).click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/reports/bugs?project=alpha&days=30');
    await expect(strip.getByRole('link', { name: /^Bugs/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('region', { name: 'Bugs', exact: true }).getByRole('definition').nth(2)).toHaveText('25');
    expect(bugsRequests()).toHaveLength(1);
  });
});
