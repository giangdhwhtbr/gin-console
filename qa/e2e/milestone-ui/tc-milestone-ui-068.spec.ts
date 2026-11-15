// TC: TC-MILESTONE-UI-068@32e42bf8
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-068: Beads tab', async ({ page, ev }) => {
  // Precondition: project p with milestone m2 that has epics e1 and e2, and a bead x under milestone m3.
  await stubApi(page, {
    projects: ['p'],
    milestone: { m2: detail([epicPlan('e1'), epicPlan('e2')], { id: 'm2' }) },
    beads: [
      bead('m2', { issue_type: 'milestone' }),
      bead('m3', { issue_type: 'milestone' }),
      bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
      bead('e2', { issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
      bead('x', { issue_type: 'task', parent: 'm3', milestone: 'm3' }),
    ],
  });

  await ev.step('1. Open /milestones/p/m2?tab=beads', async () => {
    await page.goto('/milestones/p/m2?tab=beads');
    await expect(page.getByRole('tab', { name: 'Beads' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    const tree = page.getByRole('tree', { name: 'Beads of p' });
    await expect(tree.getByRole('treeitem')).toHaveCount(2);
    await expect(tree.getByRole('treeitem').filter({ hasText: 'Title e1' })).toBeVisible();
    await expect(tree.getByRole('treeitem').filter({ hasText: 'Title e2' })).toBeVisible();
    await expect(tree.getByRole('treeitem').filter({ hasText: 'Title x' })).toHaveCount(0);
    await expect(page.getByLabel('Milestone', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Milestone', exact: true })).toHaveCount(0);
  });
});
