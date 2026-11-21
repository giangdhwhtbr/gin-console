// TC: TC-UI-029@917b4962
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-029: No gaps (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: a report with no coverage gaps and no failed project; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=alpha&tab=delivery`', async () => {
    await page.goto('/reports?project=alpha&tab=delivery');
    const coverage = page.getByRole('tab', { name: /^Data coverage/ });
    await expect(coverage).toContainText('0 gaps');
    await expect(coverage.locator('svg')).toHaveCount(0);
  });
});
