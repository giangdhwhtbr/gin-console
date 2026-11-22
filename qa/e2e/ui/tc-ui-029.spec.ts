// TC: TC-UI-029@ebfd038c
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-029: Retired tab in a link (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the URL /reports?project=alpha&tab=coverage; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=alpha&tab=coverage`', async () => {
    await page.goto('/reports?project=alpha&tab=coverage');
    await expect(page.getByRole('tab', { name: /^Team/ })).toHaveAttribute('aria-selected', 'true');
  });
});
