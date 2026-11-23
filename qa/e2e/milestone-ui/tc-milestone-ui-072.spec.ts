// TC: TC-MILESTONE-UI-072@c9472824
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, milestoneOption, stubApi } from '../support/api';

test('TC-MILESTONE-UI-072: Closed milestone', async ({ page, ev }) => {
  // Precondition: closed milestone m1 of project p whose beads are all closed; "Show closed" is off.
  const closed = { status: 'closed', closed_at: '2026-10-09T00:00:00Z', milestone: 'm1' };
  await stubApi(page, {
    projects: ['p'],
    milestone: { m1: detail([epicPlan('e1', { status: 'closed' })], { id: 'm1', status: 'closed' }) },
    milestoneOptions: { milestones: [milestoneOption('m1', { status: 'closed' })], current: null },
    beads: [
      bead('m1', { issue_type: 'milestone', status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
      bead('e1', { issue_type: 'epic', parent: 'm1', ...closed }),
      bead('t1', { issue_type: 'task', parent: 'e1', ...closed }),
    ],
  });

  await ev.step('1. Open /milestones/p/m1?tab=beads', async () => {
    await page.goto('/milestones/p/m1?tab=beads');
    await expect(page.getByRole('switch', { name: 'Show closed' })).not.toBeChecked();
    const tree = page.getByRole('tree', { name: 'Beads of p' });
    await expect(tree.getByRole('treeitem').filter({ hasText: 'Title e1' })).toBeVisible();
    await expect(tree.getByRole('treeitem').filter({ hasText: 'Title t1' })).toBeVisible();
  });
});
