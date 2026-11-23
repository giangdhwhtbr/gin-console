// TC: TC-UI-235@d4b0cbf4
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-235: My Tasks of the current project (REQ-UI-124)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is b.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'] });

  await ev.step('1. Open `/beads?project=b`', async () => {
    await page.goto('/beads?project=b');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
  });

  await ev.step('2. Click "My Tasks" in the main navigation', async () => {
    await mainNav(page).getByRole('link', { name: 'My Tasks', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/my-tasks?project=b');
    await expect(page.getByRole('heading', { name: 'My Tasks', level: 1 })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveCount(0);
  });
});
