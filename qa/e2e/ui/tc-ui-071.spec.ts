// TC: TC-UI-071@45b38d34
import { test, expect } from '../evidence';
import { epicOf, panelOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-071: Task (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha with task b that has no children, blocked by task a of e-1.
  await stubProject(page, 'alpha', [epicOf('e-1'), taskOf('a', 'e-1'), taskOf('b', 'e-1', ['a'], { title: 'Task b' })]);

  await ev.step('1. Open `/beads/alpha/b/graph`', async () => {
    await page.goto('/beads/alpha/b/graph');
    await expect(page).toHaveURL(/\/beads\?project=alpha&view=graph&scope=e-1&select=b$/);
    await expect(panelOf(page).getByRole('heading', { name: 'Task b' })).toBeVisible();
  });
});
