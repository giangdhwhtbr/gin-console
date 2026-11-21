// TC: TC-UI-070@f13095cb
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-070: Current destination: Bead page (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: project alpha is stubbed.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['alpha'] });
  const nav = page.getByRole('navigation', { name: 'Main' });

  await ev.step('1. Open /beads/alpha/a-1', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(nav).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Beads' })).toHaveAttribute('aria-current', 'page');
  });
});
