// TC: TC-UI-406@bd3cca8d
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-406: Bugs page title (REQ-UI-063)', async ({ page, ev }) => {
  // Precondition: project example is configured with a report.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['example'] });

  await ev.step('1. Open `/reports/bugs?project=example`', async () => {
    await page.goto('/reports/bugs?project=example');
    await expect(page).toHaveTitle('Reports · Bugs · example · gin-console');
  });
});
