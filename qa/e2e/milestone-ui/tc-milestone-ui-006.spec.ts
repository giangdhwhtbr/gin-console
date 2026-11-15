// TC: TC-MILESTONE-UI-006@a3a73726
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-006: Graph view marks a dependency outside the milestone as external', async ({ page, ev }) => {
  // Precondition: epic A in M1 depending on epic X in M2.
  await stubApi(page, {
    milestone: { M1: detail([epicPlan('A', { title: 'Epic A', external_depends_on: [{ id: 'X', milestone: 'M2' }] })]) },
    beads: [
      bead('M1', { issue_type: 'milestone' }),
      bead('M2', { issue_type: 'milestone' }),
      bead('A', { title: 'Epic A', issue_type: 'epic', parent: 'M1', blocked_by: ['X'] }),
      bead('X', { title: 'Epic X', issue_type: 'epic', parent: 'M2' }),
    ],
  });

  await ev.step('1. Open /milestones/P/M1?tab=beads&view=graph', async () => {
    await page.goto('/milestones/P/M1?tab=beads&view=graph');
    await expect(page.getByRole('tab', { name: 'Beads' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'true');
    const a = page.locator('[data-node="A"]');
    const x = page.locator('[data-node="X"]');
    await expect(a).toHaveAttribute('data-external', 'false');
    await expect(x).toHaveAttribute('data-external', 'true');
    await expect(page.getByText('Dashed nodes are outside this milestone.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Dependencies' }).getByRole('listitem')).toHaveText(['A is blocked by X']);
  });
});
