// TC: TC-UI-218@44bfbe07
import { test, expect } from '../evidence';
import { arrowsOf, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-218: Through tasks (REQ-UI-079)', async ({ page, ev }) => {
  // Precondition: epics e-1 and e-2 in alpha without a parent; task x of e-1 blocks tasks y and z of e-2.
  await stubProject(page, 'alpha', [
    epicOf('e-1'),
    epicOf('e-2'),
    taskOf('x', 'e-1'),
    taskOf('y', 'e-2', ['x']),
    taskOf('z', 'e-2', ['x']),
  ]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph');
    await expect(nodeOf(page, 'e-1')).toBeVisible();
    await expect(nodeOf(page, 'e-2')).toBeVisible();
    // one arrow from e-1 to e-2, labelled with its number of links
    await expect(page.getByRole('list', { name: 'Dependencies' }).locator('> li > span')).toHaveText(['e-2 is blocked by e-1']);
    await expect(page.getByTestId('graph-canvas').getByText('2 links', { exact: true })).toBeVisible();
    await expect(arrowsOf(page)).toHaveCount(1);
  });
});
