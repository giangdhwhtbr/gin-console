// TC: TC-MILESTONE-UI-062@cc8f4750
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-062: Expand an epic shows its closed children', async ({ page, ev }) => {
  const epicId = 'gin-workflow-rm-cost-control';
  const kids = [4, 2, 1, 3].map((n) =>
    bead(`${epicId}.${n}`, { status: 'closed', parent: epicId, closed_at: '2026-11-01T10:00:00Z' }),
  );
  await stubApi(page, {
    milestone: { M1: detail([epicPlan(epicId, { status: 'closed' })]) },
    beads: [bead(epicId, { issue_type: 'epic', status: 'closed', closed_at: '2026-11-01T10:00:00Z' }), ...kids],
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('button', { name: `Show 4 child beads of ${epicId}` })).toBeVisible();
    await expect(page.locator(`[data-epic="${epicId}"]`)).toContainText('4/4 closed');
    await expect(page.locator('[data-child]')).toHaveCount(0);
  });

  await ev.step(`2. Click "Show 4 child beads of ${epicId}"`, async () => {
    await page.getByRole('button', { name: `Show 4 child beads of ${epicId}` }).click();
    const rows = page.locator('[data-child]');
    await expect(rows).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(rows.nth(i)).toHaveAttribute('data-child', `${epicId}.${i + 1}`);
      await expect(rows.nth(i)).toContainText(`.${i + 1}`);
      await expect(rows.nth(i)).toContainText('closed 1 Nov');
      await expect(rows.nth(i).locator('[data-shade]')).toHaveCount(1);
      await expect(rows.nth(i).locator('[data-bead]')).toHaveCount(0);
    }
  });
});
