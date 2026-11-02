// TC: TC-MILESTONE-UI-064@c785d859
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-064: Open child shows its status instead of a date', async ({ page, ev }) => {
  await stubApi(page, {
    milestone: { M1: detail([epicPlan('B')]) },
    beads: [
      bead('B', { issue_type: 'epic' }),
      bead('B.2', { status: 'in_progress', parent: 'B' }),
    ],
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('button', { name: 'Show 1 child bead of B' })).toBeVisible();
  });

  await ev.step('2. Expand B', async () => {
    await page.getByRole('button', { name: 'Show 1 child bead of B' }).click();
    const row = page.locator('[data-child="B.2"]');
    await expect(row).toBeVisible();
    await expect(row).toContainText('In progress');
    await expect(row).not.toContainText('closed');
  });
});
