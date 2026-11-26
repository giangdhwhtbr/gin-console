// TC: TC-REPORTS-104@93927772
import { test, expect } from '../evidence';
import { bugsBody, stubReports } from '../support/reports';

test('TC-REPORTS-104: Bugs section failure and retry (REQ-REPORTS-044)', async ({ page, ev }) => {
  // Precondition: GET /api/reports/bugs is held, then answers 502, then 200.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubReports(page, { projects: ['alpha'] });
  let calls = 0;
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/reports/bugs**', async (route) => {
    calls += 1;
    if (calls > 1) return route.fulfill({ json: bugsBody('alpha') });
    await held;
    return route.fulfill({ status: 502, json: { error: 'boom' } });
  });
  const panel = page.getByRole('region', { name: 'Bugs', exact: true });

  await ev.step('1. Open `/reports/bugs?project=alpha&days=30`', async () => {
    await page.goto('/reports/bugs?project=alpha&days=30');
    await expect(panel.getByText('Loading bugs…')).toBeVisible();
    release();
    await expect(panel.getByText('The bugs report could not be loaded')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  await ev.step('2. Press Retry', async () => {
    await panel.getByRole('button', { name: 'Retry' }).click();
    await expect(panel.getByRole('definition').first()).toHaveText('13');
    await expect(panel.getByText('The bugs report could not be loaded')).toHaveCount(0);
  });
});
