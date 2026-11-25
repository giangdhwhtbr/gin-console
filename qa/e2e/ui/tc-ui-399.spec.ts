// TC: TC-UI-399@0ad5623c
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-399: My work page title (REQ-UI-063)', async ({ page, ev }) => {
  // Precondition: project example is configured.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['example'] });

  await ev.step('1. Open `/my-tasks?project=example`', async () => {
    await page.goto('/my-tasks?project=example');
    await expect(page.getByRole('heading', { name: 'My work', level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('My work · example · gin-console');
  });
});
