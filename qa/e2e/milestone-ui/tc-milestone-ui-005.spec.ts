// TC: TC-MILESTONE-UI-005@d2d9b877
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-005: Graph view shows epics and their dependency edge', async ({ page, ev }) => {
  // Precondition: milestone M1 of project P with epics A and B, B depending on A.
  await stubApi(page, {
    milestone: { M1: detail([epicPlan('A'), epicPlan('B', { depends_on: ['A'] })]) },
    beads: [
      bead('M1', { issue_type: 'milestone' }),
      bead('A', { issue_type: 'epic', parent: 'M1', ready: true }),
      bead('B', { issue_type: 'epic', parent: 'M1', blocked: true, blocked_by: ['A'] }),
    ],
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('heading', { name: 'Beta readiness' })).toBeVisible();
  });

  await ev.step('2. Click the "Beads" tab', async () => {
    await page.getByRole('tab', { name: 'Beads' }).click();
    await expect(page).toHaveURL(/[?&]tab=beads(&|$)/);
    await expect(page.getByRole('tab', { name: 'Beads' })).toHaveAttribute('aria-selected', 'true');
  });

  await ev.step('3. Choose "Graph" in the views', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();
    await expect(page).toHaveURL(/[?&]tab=beads(&|$)/);
    await expect(page).toHaveURL(/[?&]view=graph(&|$)/);
    const panel = page.getByRole('tabpanel');
    await expect(panel.locator('[data-node="A"]')).toBeVisible();
    await expect(panel.locator('[data-node="B"]')).toBeVisible();
    const edges = panel.getByRole('list', { name: 'Dependencies' }).getByRole('listitem');
    await expect(edges).toHaveCount(1);
    await expect(edges).toHaveText('B is blocked by A');
  });
});
