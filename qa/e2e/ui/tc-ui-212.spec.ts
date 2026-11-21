// TC: TC-UI-212@fa2ee49a
import { test, expect } from '../evidence';
import { epicOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-212: Task with a blocker (REQ-UI-053)', async ({ page, ev }) => {
  // Precondition: project p has task t-2 of epic e-1 with one blocker.
  await stubProject(page, 'p', [epicOf('e-1'), taskOf('t-1', 'e-1'), taskOf('t-2', 'e-1', ['t-1'])]);

  await ev.step('1. Open `/beads/p/t-2`', async () => {
    await page.goto('/beads/p/t-2');
    const link = page.getByRole('link', { name: 'View in graph' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/beads?project=p&view=graph&scope=e-1&select=t-2');
  });
});
