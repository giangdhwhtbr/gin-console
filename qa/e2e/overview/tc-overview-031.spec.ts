// TC: TC-OVERVIEW-031@af839bb4
import { test, expect } from '../evidence';
import { overview, stubApi } from '../support/api';
import { signIn } from '../support/overview';

test('TC-OVERVIEW-031: No projects (REQ-OVERVIEW-010)', async ({ page, ev }) => {
  // Precondition: no project is configured.
  await signIn(page);
  await stubApi(page, { projects: [], overview: overview([]) });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByText(/No projects configured/).first()).toBeVisible();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/');
  });
});
