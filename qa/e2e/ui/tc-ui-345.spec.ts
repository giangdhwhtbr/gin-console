// TC: TC-UI-345@04a9a696
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-UI-345: Clear filters on a fixed milestone (REQ-UI-143)', async ({ page, ev }) => {
  // Precondition: project p has milestone m2 with beads; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['p'],
    milestone: { m2: detail([epicPlan('e1'), epicPlan('e2')], { id: 'm2' }) },
    beads: [
      bead('m2', { issue_type: 'milestone' }),
      bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2', status: 'open' }),
      bead('e2', { issue_type: 'epic', parent: 'm2', milestone: 'm2', status: 'in_progress' }),
    ],
  });
  const items = page.getByRole('tree', { name: 'Beads of p' }).getByRole('treeitem');

  await ev.step('1. Open `/milestones/p/m2?tab=beads&status=open`', async () => {
    await page.goto('/milestones/p/m2?tab=beads&status=open');
    await expect(items).toHaveCount(1);
    await expect(items.filter({ hasText: 'Title e1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  });

  await ev.step('2. Click `button "Clear filters"`', async () => {
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/milestones/p/m2?tab=beads');
    await expect(items).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
  });
});
