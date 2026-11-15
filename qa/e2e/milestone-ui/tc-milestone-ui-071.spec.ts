// TC: TC-MILESTONE-UI-071@1c52690e
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-071: Old Graph link', async ({ page, ev }) => {
  // Precondition: milestone m2 of project p with epics.
  await stubApi(page, {
    projects: ['p'],
    milestone: { m2: detail([epicPlan('e1'), epicPlan('e2', { depends_on: ['e1'] })], { id: 'm2' }) },
    beads: [
      bead('m2', { issue_type: 'milestone' }),
      bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
      bead('e2', { issue_type: 'epic', parent: 'm2', milestone: 'm2', blocked: true, blocked_by: ['e1'] }),
    ],
  });

  await ev.step('1. Open /milestones/p/m2?tab=graph', async () => {
    await page.goto('/milestones/p/m2?tab=graph');
    await expect(page.getByRole('tab', { name: 'Beads' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/[?&]tab=beads(&|$)/);
    await expect(page).toHaveURL(/[?&]view=graph(&|$)/);
    await expect(page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-node="e1"]')).toBeVisible();
    await expect(page.locator('[data-node="e2"]')).toBeVisible();
  });
});
