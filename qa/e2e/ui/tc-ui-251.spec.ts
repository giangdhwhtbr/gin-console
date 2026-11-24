// TC: TC-UI-251@78e17aa4
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-251: Reports section (REQ-UI-063)', async ({ page, ev }) => {
  // Precondition: project example has a report.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['example'] });

  await ev.step('1. Open `/reports/rework?project=example`', async () => {
    await page.goto('/reports/rework?project=example');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('Reports · Rework · example · gin-console');
  });
});
