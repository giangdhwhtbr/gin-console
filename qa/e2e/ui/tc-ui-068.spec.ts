// TC: TC-UI-068@407a6ece
import { test, expect } from '../evidence';
import { arrowsOf, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-068: Project (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: epics r-1 and r-2 without a parent, r-2 blocked by r-1, each with tasks.
  await stubProject(page, 'alpha', [
    epicOf('r-1'),
    epicOf('r-2', { blocked: true, blocked_by: ['r-1'], dependency_count: 1 }),
    taskOf('r-1.1', 'r-1'),
    taskOf('r-2.1', 'r-2'),
  ]);

  await ev.step('1. Open `/beads/alpha/graph`', async () => {
    await page.goto('/beads/alpha/graph');
    await expect(page).toHaveURL(/\/beads\?project=alpha&view=graph$/);
    await expect(nodeOf(page, 'r-1')).toBeVisible();
    await expect(nodeOf(page, 'r-2')).toBeVisible();
    await expect(nodeOf(page, 'r-1.1')).toHaveCount(0);
    await expect(nodeOf(page, 'r-2.1')).toHaveCount(0);
    await expect(arrowsOf(page)).toHaveText(['r-2 is blocked by r-1']);
  });
});
