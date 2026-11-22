// TC: TC-UI-077@3134b1b0
import { test, expect } from '../evidence';
import { closedOn, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-077: Prep task in the scope (REQ-UI-049)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha has tasks t-1 (closed), t-2 (open) and prep task p-1 (open, labels prep and prep:mockup).
  await stubProject(page, 'alpha', [
    epicOf('e-1'),
    taskOf('t-1', 'e-1', [], closedOn),
    taskOf('t-2', 'e-1'),
    taskOf('p-1', 'e-1', [], { labels: ['prep', 'prep:mockup'] }),
  ]);

  await ev.step('1. Open `/beads/alpha/e-1?tab=graph&closed=1`', async () => {
    await page.goto('/beads/alpha/e-1?tab=graph&closed=1');
    for (const id of ['t-1', 't-2', 'p-1']) await expect(nodeOf(page, id)).toBeVisible();
    await expect(nodeOf(page, 'p-1').getByText('Prep', { exact: true })).toBeVisible();
    await expect(nodeOf(page, 't-1').getByText('Prep', { exact: true })).toHaveCount(0);
    await expect(nodeOf(page, 't-2').getByText('Prep', { exact: true })).toHaveCount(0);
  });
});
