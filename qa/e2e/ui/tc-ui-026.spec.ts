// TC: TC-UI-026@e5702730
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-026: Unknown section (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the URL /reports/nope?project=alpha; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports/nope?project=alpha`', async () => {
    await page.goto('/reports/nope?project=alpha');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
