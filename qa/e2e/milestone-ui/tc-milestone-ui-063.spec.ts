// TC: TC-MILESTONE-UI-063@2cf44135
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-063: Epic without children has no expand button', async ({ page, ev }) => {
  // Epic A has no children; epic B has one, so its button proves the beads had loaded.
  await stubApi(page, {
    milestone: { M1: detail([epicPlan('A'), epicPlan('B')]) },
    beads: [
      bead('A', { issue_type: 'epic' }),
      bead('B', { issue_type: 'epic' }),
      bead('B.1', { status: 'closed', parent: 'B', closed_at: '2026-11-01T10:00:00Z' }),
    ],
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('button', { name: 'Show 1 child bead of B' })).toBeVisible();
    const a = page.locator('[data-epic="A"]');
    await expect(a).toBeVisible();
    await expect(a.getByRole('button', { name: /child bead/ })).toHaveCount(0);
    await expect(a).not.toContainText('closed');
  });
});
