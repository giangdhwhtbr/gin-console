// TC: TC-UI-140@64d1c6f5
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-140: Home address (REQ-UI-099)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'], beads: [bead('a-1', { ready: true, assignee: 'qa@example.com' })] });
  await page.goto('/beads?project=a');

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/my-tasks?project=a');
    await expect(page.getByRole('link', { name: 'Title a-1' })).toBeVisible();
  });

  await ev.step('2. Press the browser Back button', async () => {
    await page.goBack();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/beads?project=a');
  });
});
