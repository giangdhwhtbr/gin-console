// TC: TC-UI-237@24d5b5e1
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-237: Unknown path (REQ-UI-125)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'] });

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
  });

  await ev.step('2. Open `/nope`', async () => {
    await page.goto('/nope');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    const main = page.getByRole('main');
    await expect(main.getByText('/nope')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Beads' })).toHaveAttribute('href', '/beads?project=a');
    await expect(main.getByRole('link', { name: 'My work' })).toHaveAttribute('href', '/my-tasks?project=a');
    await expect(page).toHaveTitle('Page not found · gin-console');
    await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(0);
  });
});
