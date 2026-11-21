// TC: TC-UI-214@272a3100
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProject } from '../support/graph';

test('TC-UI-214: Nothing to draw (REQ-UI-053)', async ({ page, ev }) => {
  // Precondition: project p has task t-9 without blockers that blocks nothing and has no child.
  await stubProject(page, 'p', [bead('t-9', { title: 'Lonely task' })]);

  await ev.step('1. Open `/beads/p/t-9`', async () => {
    await page.goto('/beads/p/t-9');
    await expect(page.getByRole('heading', { name: 'Lonely task' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View in graph' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View in graph' })).toHaveCount(0);
  });
});
