// TC: TC-MILESTONE-UI-020@1ffc817b
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-MILESTONE-UI-020: Project Dependencies graph keeps epics under a milestone', async ({ page, ev }) => {
  // Precondition: epics A and B of project P, B depending on A, both children of milestone M1.
  await stubApi(page, {
    beads: [
      bead('M1', { issue_type: 'milestone', title: 'Milestone one' }),
      bead('A', { issue_type: 'epic', parent: 'M1', ready: true }),
      bead('B', { issue_type: 'epic', parent: 'M1', blocked: true, blocked_by: ['A'] }),
    ],
  });

  await ev.step('1. Open /beads/P/graph', async () => {
    await page.goto('/beads/P/graph');
    const canvas = page.getByTestId('graph-canvas');
    const nodes = canvas.getByRole('button');
    await expect(nodes).toHaveCount(2);
    await expect(canvas.getByRole('button', { name: /^A\b/ })).toBeVisible();
    await expect(canvas.getByRole('button', { name: /^B\b/ })).toBeVisible();
    const edges = page.getByRole('list', { name: 'Dependencies' }).getByRole('listitem');
    await expect(edges).toHaveCount(1);
    await expect(edges).toHaveText('B is blocked by A');
    await expect(page.getByText('M1', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Milestone one')).toHaveCount(0);
  });
});
