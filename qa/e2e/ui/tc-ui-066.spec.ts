// TC: TC-UI-066@309e779b
import { test, expect } from '../evidence';
import { closedOn, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-066: Node with a prep task (REQ-UI-049)', async ({ page, ev }) => {
  // Precondition: epic e-1 without a parent, tracks t-1 (closed) and t-2 (open), prep task p-1 (open, labels prep and prep:mockup).
  // Another epic waits on e-1, so the project graph (only linked beads) draws it.
  await stubProject(page, 'alpha', [
    epicOf('e-1'),
    taskOf('t-1', 'e-1', [], closedOn),
    taskOf('t-2', 'e-1'),
    taskOf('p-1', 'e-1', [], { labels: ['prep', 'prep:mockup'] }),
    epicOf('e-2', { blocked: true, blocked_by: ['e-1'], dependency_count: 1 }),
  ]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph&closed=1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&closed=1');
    const node = nodeOf(page, 'e-1');
    await expect(node).toBeVisible();
    const strand = node.locator('[data-strand]');
    await expect(strand).toHaveAttribute('data-strand', '1/2');
    await expect(strand.locator('[data-bead]')).toHaveCount(2);
    await expect(strand).toContainText('1/2');
    await expect(node.locator('svg.lucide-layers')).toBeVisible();
  });

  await ev.step('2. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1&closed=1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1&closed=1');
    await expect(nodeOf(page, 'p-1')).toBeVisible();
    await expect(nodeOf(page, 'p-1').getByText('Prep', { exact: true })).toBeVisible();
    await expect(nodeOf(page, 't-1')).toBeVisible();
    await expect(nodeOf(page, 't-1').getByText('Prep', { exact: true })).toHaveCount(0);
    await expect(nodeOf(page, 't-2').getByText('Prep', { exact: true })).toHaveCount(0);
  });
});
