// TC: TC-MILESTONE-UI-006@9e6ec162
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-006: Graph tab marks a dependency outside the milestone as external', async ({ page, ev }) => {
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

  await ev.step('1. Open /milestones/P/M1?tab=graph', async () => {
    await page.goto('/milestones/P/M1?tab=graph');
    await expect(page.getByRole('tab', { name: 'Graph' })).toHaveAttribute('aria-selected', 'true');
    const a = page.getByRole('button', { name: /^A\b/ });
    const x = page.getByRole('button', { name: /^X\b/ });
    await expect(a).toHaveAttribute('data-external', 'false');
    await expect(x).toHaveAttribute('data-external', 'true');
    await expect(page.getByText('Dashed nodes are outside this milestone.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Dependencies' }).getByRole('listitem')).toHaveText(['A is blocked by X']);
  });
});
