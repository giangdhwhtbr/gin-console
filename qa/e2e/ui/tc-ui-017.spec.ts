// TC: TC-UI-017@d40353fe
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-017: Projects fail in My Tasks', async ({ page, ev }) => {
  // Precondition: GET /api/projects/beads responds 500.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['A'] });
  await page.route('**/api/projects/beads', (route) => route.fulfill({ status: 500, json: { error: 'projects down' } }));

  await ev.step('1. Open /my-tasks', async () => {
    await page.goto('/my-tasks');
    await expect(page.getByText('Projects could not be loaded')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(0);
  });
});
