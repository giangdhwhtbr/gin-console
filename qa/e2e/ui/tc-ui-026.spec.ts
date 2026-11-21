// TC: TC-UI-026@39ded05e
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-026: Unknown tab (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the URL /reports?project=alpha&tab=nope; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=alpha&tab=nope`', async () => {
    await page.goto('/reports?project=alpha&tab=nope');
    await expect(page.getByRole('tab', { name: /^Team/ })).toHaveAttribute('aria-selected', 'true');
  });
});
