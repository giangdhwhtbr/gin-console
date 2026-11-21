// TC: TC-UI-217@1c6a2000
import { test, expect } from '../evidence';
import { arrowsOf, epicOf, nodeOf, stubProject } from '../support/graph';

test('TC-UI-217: Direct relation (REQ-UI-079)', async ({ page, ev }) => {
  // Precondition: epics r-1 and r-2 in alpha without a parent, r-2 blocked by r-1.
  await stubProject(page, 'alpha', [epicOf('r-1'), epicOf('r-2', { blocked: true, blocked_by: ['r-1'], dependency_count: 1 })]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph');
    await expect(nodeOf(page, 'r-1')).toBeVisible();
    await expect(arrowsOf(page)).toHaveText(['r-2 is blocked by r-1']);
    // the arrow has no label
    await expect(page.getByTestId('graph-canvas').getByText(/\d+ links/)).toHaveCount(0);
  });
});
