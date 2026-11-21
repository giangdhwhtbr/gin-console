// TC: TC-UI-245@7c15c1c3
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-245: Skip the navigation (REQ-UI-128)', async ({ page, ev }) => {
  // Precondition: project a is configured.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a'] });
  const skip = page.getByRole('link', { name: 'Skip to content' });

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
  });

  await ev.step('2. Press Tab', async () => {
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
  });

  await ev.step('3. Press Enter', async () => {
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await expect(skip).not.toBeInViewport();
  });
});
