// TC: TC-MILESTONE-UI-032@75b1148e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-MILESTONE-UI-032: List view hides the milestone and roots its epics', async ({ page, ev }) => {
  // Precondition: P reports milestone M1 with child epics A and B.
  await stubApi(page, {
    beads: [
      bead('M1', { title: 'Beta readiness', issue_type: 'milestone' }),
      bead('A', { title: 'Epic Alpha', issue_type: 'epic', parent: 'M1' }),
      bead('B', { title: 'Epic Bravo', issue_type: 'epic', parent: 'M1' }),
    ],
  });

  await ev.step('1. Open /beads?project=P', async () => {
    await page.goto('/beads?project=P');
    await expect(page.getByRole('navigation', { name: 'View' })).toBeVisible();
  });

  await ev.step('2. Choose the "List" view', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'List' }).click();
    await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    const tree = page.getByRole('tree', { name: 'Beads of P' });
    await expect(tree.getByRole('treeitem')).toHaveCount(2);
    await expect(tree).not.toContainText('M1');
    await expect(tree).not.toContainText('Beta readiness');
    await expect(tree.getByRole('treeitem', { name: /Epic Alpha/ })).toHaveAttribute('aria-level', '1');
    await expect(tree.getByRole('treeitem', { name: /Epic Bravo/ })).toHaveAttribute('aria-level', '1');
  });
});
