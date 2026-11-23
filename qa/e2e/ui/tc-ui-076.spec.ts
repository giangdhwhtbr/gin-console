// TC: TC-UI-076@3a6e5879
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-076: Current destination: Change page (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: project alpha is stubbed.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['alpha'] });
  const nav = page.getByRole('navigation', { name: 'Main' });

  await ev.step('1. Open /beads?project=alpha', async () => {
    await page.goto('/beads?project=alpha');
    await expect(nav.getByRole('link', { name: 'Beads' })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('2. Click "Reports" in the main navigation', async () => {
    await nav.getByRole('link', { name: 'Reports' }).click();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page');
  });
});
