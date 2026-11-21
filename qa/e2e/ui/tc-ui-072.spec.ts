// TC: TC-UI-072@0a5ff03f
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-072: Current destination: Milestone page (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: project alpha is stubbed.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['alpha'] });
  const nav = page.getByRole('navigation', { name: 'Main' });

  await ev.step('1. Open /milestones/alpha/m-1', async () => {
    await page.goto('/milestones/alpha/m-1');
    await expect(nav).toBeVisible();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Milestones' })).toHaveAttribute('aria-current', 'page');
  });
});
