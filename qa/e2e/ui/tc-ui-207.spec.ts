// TC: TC-UI-207@cd9ac437
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-207: Bead with children (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: project p has task t-1, not an epic, with a child.
  await stubProject(page, 'p', [bead('t-1'), taskOf('t-1.1', 't-1')]);

  await ev.step('1. Open `/beads/p/t-1/graph`', async () => {
    await page.goto('/beads/p/t-1/graph');
    await expect(page).toHaveURL(/\/beads\?project=p&view=graph&scope=t-1$/);
    await expect(nodeOf(page, 't-1.1')).toBeVisible();
  });
});
