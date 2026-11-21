// TC: TC-UI-069@9ed5bf31
import { test, expect } from '../evidence';
import { epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-069: Nested epics (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: epic r in alpha has child epics e-1 and e-2, each with tasks.
  await stubProject(page, 'alpha', [
    epicOf('r'),
    epicOf('e-1', { parent: 'r' }),
    epicOf('e-2', { parent: 'r' }),
    taskOf('e-1.1', 'e-1'),
    taskOf('e-2.1', 'e-2'),
  ]);

  await ev.step('1. Open `/beads/alpha/r/graph`', async () => {
    await page.goto('/beads/alpha/r/graph');
    await expect(page).toHaveURL(/\/beads\/alpha\/r\?tab=graph$/);
    await expect(nodeOf(page, 'e-1')).toBeVisible();
    await expect(nodeOf(page, 'e-2')).toBeVisible();
    await expect(nodeOf(page, 'e-1.1')).toHaveCount(0);
    await expect(nodeOf(page, 'e-2.1')).toHaveCount(0);
  });
});
