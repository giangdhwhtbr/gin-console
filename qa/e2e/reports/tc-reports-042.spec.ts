// TC: TC-REPORTS-042@32adf2eb
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-042: Failure (REQ-REPORTS-017)', async ({ page, ev }) => {
  // Precondition: /api/reports/team answers 502 once and then 200.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['alpha'] });
  let asked = 0;
  await page.route('**/api/reports/team**', (route) => {
    asked += 1;
    return asked === 1
      ? route.fulfill({ status: 502, json: { error: 'bd failed' } })
      : route.fulfill({ json: teamBody('alpha') });
  });

  await ev.step('1. Open `/reports/team?project=alpha`', async () => {
    await page.goto('/reports/team?project=alpha');
    await expect(page.getByText('The team report could not be loaded')).toBeVisible();
    await expect(page.getByText('bd failed')).toBeVisible();
  });

  await ev.step('2. Press Retry', async () => {
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('The team report could not be loaded')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toBeVisible();
  });
});
