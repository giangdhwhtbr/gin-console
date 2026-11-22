// TC: TC-UI-229@2b46c8a2
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-229: Icon rail (REQ-UI-123)', async ({ page, ev }) => {
  // Precondition: project qwikfone is configured; the window is 820px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 820, height: 900 });
  await stubApi(page, { projects: ['qwikfone'] });

  await ev.step('1. Open `/beads?project=qwikfone`', async () => {
    await page.goto('/beads?project=qwikfone');
    const rail = page.getByRole('button', { name: 'Project: qwikfone' });
    await expect(rail).toBeVisible();
    await expect(rail).toHaveText('Q');
  });
});
