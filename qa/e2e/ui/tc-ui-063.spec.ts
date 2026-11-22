// TC: TC-UI-063@8a7365f0
import { test, expect } from '../evidence';
import { closedOn, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-063: Node with children (REQ-UI-049)', async ({ page, ev }) => {
  // Precondition: epic e-1 without a parent with tasks t-1 (closed), t-2, t-3. Another epic waits on e-1, so the project graph (only linked beads) draws it.
  await stubProject(page, 'alpha', [
    epicOf('e-1'),
    taskOf('t-1', 'e-1', [], closedOn),
    taskOf('t-2', 'e-1'),
    taskOf('t-3', 'e-1'),
    epicOf('e-2', { blocked: true, blocked_by: ['e-1'], dependency_count: 1 }),
  ]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph&closed=1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&closed=1');
    const node = nodeOf(page, 'e-1');
    await expect(node).toBeVisible();
    // the strand of 3 beads followed by "1/3"
    const strand = node.getByRole('img', { name: /of 3 tracks$/ });
    await expect(strand).toHaveAttribute('data-strand', '1/3');
    await expect(strand.locator('[data-bead]')).toHaveCount(3);
    await expect(strand).toContainText('1/3');
    // the open icon: the layers mark that says the node has children
    await expect(node.locator('svg.lucide-layers')).toBeVisible();
  });
});
