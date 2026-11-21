// TC: TC-UI-238@a04015f4
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-238: Retired address (REQ-UI-125)', async ({ page, ev }) => {
  // Precondition: projects are configured.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['alpha', 'beta'] });

  await ev.step('1. Open `/sessions/alpha/s-1`', async () => {
    await page.goto('/sessions/alpha/s-1');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(mainNav(page)).toBeVisible();
    await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(0);
  });
});
