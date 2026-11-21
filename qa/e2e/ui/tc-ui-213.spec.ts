// TC: TC-UI-213@8509d9e4
import { test, expect } from '../evidence';
import { epicOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-213: Epic offers the Graph tab (REQ-UI-053)', async ({ page, ev }) => {
  // Precondition: project p has epic e-1 with children.
  await stubProject(page, 'p', [epicOf('e-1'), taskOf('t-1', 'e-1'), taskOf('t-2', 'e-1', ['t-1'])]);

  await ev.step('1. Open `/beads/p/e-1`', async () => {
    await page.goto('/beads/p/e-1');
    await expect(page.getByRole('tab', { name: 'Graph' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View in graph' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View in graph' })).toHaveCount(0);
  });
});
