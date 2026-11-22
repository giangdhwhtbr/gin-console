// TC: TC-MILESTONE-UI-104@57423c50
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-104: Merge gate and lane', async ({ page, ev }) => {
  // Precondition: milestone M1 of project P has epic e-1 with track t-1 in lane be (open) and merge gate g-1 (open) whose parent is e-1.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestone: { M1: detail([epicPlan('e-1')]) },
    beads: [
      bead('e-1', { issue_type: 'epic' }),
      bead('e-1.1', { title: 'Build the API', parent: 'e-1', lane: 'be', track: { plan: null, number: 1 } }),
      bead('g-1', {
        title: 'external: .planning/plans/p.md#2', parent: 'e-1',
        waits_for: { plan: '.planning/plans/p.md', number: 2, track_id: null, lane: null },
      }),
    ],
  });
  const row = page.locator('[data-epic="e-1"]');

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(row).toBeVisible();
    await expect(row.locator('[data-strand="0/1"]')).toContainText('0/1');
  });

  await ev.step('2. Click the expand button of e-1', async () => {
    await page.getByRole('button', { name: 'Show 1 child bead of e-1' }).click();
    const kids = page.locator('[data-child]');
    await expect(kids).toHaveCount(1);
    await expect(page.locator('[data-child="e-1.1"]').locator('[data-hint^="Lane be"]')).toHaveText('be');
    await expect(page.locator('[data-child="g-1"]')).toHaveCount(0);
  });
});
