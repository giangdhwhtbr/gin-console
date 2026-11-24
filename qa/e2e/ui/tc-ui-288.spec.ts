// TC: TC-UI-288@8b35d4b6
import { test, expect } from '../evidence';
import { reportBody, stubReports } from '../support/reports';

test('TC-UI-288: Failure shows the error with Retry', async ({ page, ev }) => {
  // Preconditions: the report request answers 502 with an error; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, { projects: ['alpha'] });
  let failing = true;
  await page.route(/\/api\/reports\?/, (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    return failing
      ? route.fulfill({ status: 502, json: { error: 'bd failed: database locked' } })
      : route.fulfill({ json: reportBody('alpha', null, { milestone: 'm2', closed: 0 }) });
  });
  const reports = () => stub.calls.filter((u) => u.pathname === '/api/reports').length;

  await ev.step('1. Open `/reports/delivery?project=alpha`', async () => {
    await page.goto('/reports/delivery?project=alpha');
    await expect(page.getByText('bd failed: database locked')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' }).first()).toBeVisible();
  });

  await ev.step('2. Press Retry', async () => {
    const before = reports();
    failing = false;
    await page.getByRole('button', { name: 'Retry' }).first().click();
    await expect.poll(reports).toBeGreaterThan(before);
  });
});
