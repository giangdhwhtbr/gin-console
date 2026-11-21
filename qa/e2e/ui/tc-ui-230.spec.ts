// TC: TC-UI-230@b581ba9d
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-230: Phone (REQ-UI-123)', async ({ page, ev }) => {
  // Precondition: project a is configured; the window is 390px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 390, height: 800 });
  await stubApi(page, { projects: ['a'] });

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    const bar = page.getByRole('banner').getByRole('button', { name: 'a', exact: true });
    await expect(bar).toBeVisible();
    await expect(page.getByRole('button', { name: /projects$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Project: a' })).toHaveCount(0);
  });
});
