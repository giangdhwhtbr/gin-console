// TC: TC-UI-339@8d487c5e
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-UI-339: Filter bar of a fixed milestone (REQ-UI-142)', async ({ page, ev }) => {
  // Precondition: project p has milestone m2; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['p'],
    milestone: { m2: detail([epicPlan('e1')], { id: 'm2' }) },
    beads: [bead('m2', { issue_type: 'milestone' }), bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' })],
  });

  await ev.step('1. Open the Beads tab of milestone `m2`, `/milestones/p/m2?tab=beads`', async () => {
    await page.goto('/milestones/p/m2?tab=beads');
    await expect(page.getByRole('tree', { name: 'Beads of p' }).getByRole('treeitem')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^Milestone\b/ })).toHaveCount(0);
    const parts = [
      page.getByRole('searchbox', { name: 'Search' }),
      page.getByRole('button', { name: 'Status', exact: true }),
      page.getByRole('button', { name: 'Assignee', exact: true }),
      page.getByRole('button', { name: 'More filters', exact: true }),
    ];
    let prev = -Infinity;
    for (const p of parts) {
      await expect(p).toBeVisible();
      const b = (await p.boundingBox())!;
      expect(b.x).toBeGreaterThan(prev);
      prev = b.x;
    }
  });
});
