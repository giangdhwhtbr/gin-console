// TC: TC-UI-009@a85a1e3d
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-009: No projects configured (REQ-UI-023)', async ({ page, ev }) => {
  // Precondition: /api/projects/beads returns [].
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: [] });

  await ev.step('1. Open `/beads`', async () => {
    await page.goto('/beads');
    await expect(page.getByText('No projects configured.')).toBeVisible();
  });
});
