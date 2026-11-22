// TC: TC-UI-270@7561c716
import { test, expect } from '../evidence';
import { closedOn, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-270: Progress with show closed off', async ({ page, ev }) => {
  // Precondition: alpha has epic e-1 with 5 tracks, 3 closed; "Show closed" is off (the default).
  await stubProject(page, 'alpha', [
    epicOf('e-1', { child_counts: { total: 5, closed: 3, prep_total: 0, prep_closed: 0 } }),
    epicOf('e-2', { blocked: true, blocked_by: ['e-1'], dependency_count: 1 }), // links e-1 so the project graph draws it
    taskOf('t-1', 'e-1', [], closedOn),
    taskOf('t-2', 'e-1', [], closedOn),
    taskOf('t-3', 'e-1', [], closedOn),
    taskOf('t-4', 'e-1', [], { ready: true }),
    taskOf('t-5', 'e-1', [], { ready: true }),
  ]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=list`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    const row = page.getByRole('treeitem', { name: /e-1/ });
    const strand = row.getByRole('img', { name: /of 5 tracks$/ });
    await expect(strand).toHaveAttribute('data-strand', '3/5');
    await expect(strand).toContainText('3/5');
  });

  await ev.step('2. Open `/beads?project=alpha&milestone=all&view=graph`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph');
    const strand = nodeOf(page, 'e-1').locator('[data-strand="3/5"]');
    await expect(strand).toBeVisible();
    await expect(strand).toContainText('3/5');
  });
});
