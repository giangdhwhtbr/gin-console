// TC: TC-REPORTS-105@b1af48fe
import { test, expect } from '../evidence';
import { bugsBody, stubReports } from '../support/reports';

test('TC-REPORTS-105: Bugs section late answer (REQ-REPORTS-044)', async ({ page, ev }) => {
  // Precondition: the answer for 30 days is held until the answer for 7 days has arrived.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubReports(page, { projects: ['alpha'] });
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/reports/bugs**', async (route) => {
    const days = new URL(route.request().url()).searchParams.get('days');
    if (days === '30') {
      await held;
      return route.fulfill({ json: bugsBody('alpha', { days: 30 }) });
    }
    return route.fulfill({
      json: bugsBody('alpha', { days: 7, figures: { total: 14, opened: 4, closed: 2, open_now: 3, oldest_open_days: 43, median_close_days: 0.5 } }),
    });
  });
  const opened = page.getByRole('region', { name: 'Bugs', exact: true }).getByRole('definition').first();

  await ev.step('1. Open `/reports/bugs?project=alpha&days=30`', async () => {
    await page.goto('/reports/bugs?project=alpha&days=30');
    await expect(page.getByText('Loading bugs…')).toBeVisible();
  });

  await ev.step('2. Pick "Last 7 days" in the scope select', async () => {
    await page.getByRole('combobox', { name: 'Report scope' }).selectOption('days:7');
    await expect(opened).toHaveText('4');
  });

  await ev.step('3. Let the answer for 30 days arrive', async () => {
    const late = page.waitForResponse((r) => r.url().includes('/api/reports/bugs') && r.url().includes('days=30'));
    release();
    await late;
    await expect(page).toHaveURL(/days=7/);
    await expect(opened).toHaveText('4');
  });
});
