// TC: TC-UI-073@51ee30ff
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-073: Current destination: Reports page (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: project alpha is stubbed.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['alpha'] });
  const nav = page.getByRole('navigation', { name: 'Main' });

  await ev.step('1. Open /reports?project=alpha', async () => {
    await page.goto('/reports?project=alpha');
    await expect(nav).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page');
  });
});
