// TC: TC-UI-275@4bc1c67b
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-275: Blocked count tooltip', async ({ page, ev }) => {
  // Precondition: project example has 4 blocked beads, so its Projects card reads "blocked 4".
  await stubApi(page, { projects: ['example'] });
  const project = {
    name: 'example', path: '/home/gin/example', exists: true, workflow: null, pull: null,
    beads: { open: 6, in_progress: 2, blocked: 4, ready: 1, epics: [] },
  };
  await page.route('**/api/projects', (route) => route.fulfill({ json: [project] }));
  await page.route('**/api/projects/beads', (route) => route.fulfill({ json: [project] }));

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByText('blocked 4')).toBeVisible();
  });

  await ev.step('2. Move the keyboard focus to "blocked 4" with Tab', async () => {
    const blocked = page.getByText('blocked 4');
    for (let i = 0; i < 40 && !(await blocked.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(blocked).toBeFocused();
    await expect(page.getByRole('tooltip')).toContainText(
      'Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart.',
      { timeout: 500 },
    );
  });

  await ev.step('3. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  });
});
