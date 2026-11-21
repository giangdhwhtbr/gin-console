// TC: TC-UI-074@4e533693
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-074: Current destination: Address of a retired page (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: project alpha is stubbed.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['alpha'] });
  const nav = page.getByRole('navigation', { name: 'Main' });

  await ev.step('1. Open /sessions/alpha/s-1', async () => {
    await page.goto('/sessions/alpha/s-1');
    await expect(nav).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
  });
});
