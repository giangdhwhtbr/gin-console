// TC: TC-UI-151@a6743b13
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-151: Home address without projects (REQ-UI-099)', async ({ page, ev }) => {
  // Precondition: no project is configured.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: [] });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/my-tasks');
    await expect(page.getByText(/No projects configured/).first()).toBeVisible();
  });
});
