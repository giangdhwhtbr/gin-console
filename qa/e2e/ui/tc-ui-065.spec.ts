// TC: TC-UI-065@23a5c851
import { test, expect } from '../evidence';
import { closedOn, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-065: Closed bead (REQ-UI-049)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha has a closed task t-1.
  await stubProject(page, 'alpha', [epicOf('e-1'), taskOf('t-1', 'e-1', [], closedOn)]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1&closed=1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1&closed=1');
    await expect(page.getByRole('switch', { name: 'Show closed' })).toBeChecked();
    const node = nodeOf(page, 't-1');
    await expect(node).toBeVisible();
    await expect(node.locator('[data-state="done"]')).toHaveText('Done');
  });
});
