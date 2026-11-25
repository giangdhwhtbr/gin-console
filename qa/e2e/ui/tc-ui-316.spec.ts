// TC: TC-UI-316@19adf430
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-316: My work row shows the state as text', async ({ page, ev }) => {
  // Preconditions: project P reports a blocked bead assigned to the signed-in email; the window is 1440px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await stubApi(page, { beads: [bead('p-1', { title: 'Stuck on a review', status: 'blocked', blocked: true, assignee: 'qa@example.com' })] });

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    await expect(page.getByRole('link', { name: 'Stuck on a review' })).toBeVisible();
  });

  const row = () => page.getByRole('row').filter({ hasText: 'Stuck on a review' });
  await ev.step('2. Find the row of the blocked bead', async () => {
    await expect(row()).toBeVisible();
    await expect(row().getByText('Blocked', { exact: true })).toBeVisible();
  });

  await ev.step('3. Read the computed border and background of its state', async () => {
    const state = row().getByText('Blocked', { exact: true });
    for (const side of ['top', 'right', 'bottom', 'left']) await expect(state).toHaveCSS(`border-${side}-width`, '0px');
    await expect(state).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(row().locator('[data-slot="badge"]')).toHaveCount(0);
  });
});
