// TC: TC-MILESTONE-UI-005@1e745d94
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-005: Graph tab shows epics and their dependency edge', async ({ page, ev }) => {
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

  await ev.step('2. Click the "Graph" tab', async () => {
    await page.getByRole('tab', { name: 'Graph' }).click();
    await expect(page).toHaveURL(/[?&]tab=graph(&|$)/);
    await expect(page.getByRole('tab', { name: 'Graph' })).toHaveAttribute('aria-selected', 'true');
    const panel = page.getByRole('tabpanel', { name: 'Graph' });
    await expect(panel.getByRole('button', { name: /^A\b/ })).toBeVisible();
    await expect(panel.getByRole('button', { name: /^B\b/ })).toBeVisible();
    const edges = panel.getByRole('list', { name: 'Dependencies' }).getByRole('listitem');
    await expect(edges).toHaveCount(1);
    await expect(edges).toHaveText('B is blocked by A');
  });
});
