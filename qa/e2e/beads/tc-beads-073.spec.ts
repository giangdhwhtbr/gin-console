// TC: TC-BEADS-073@b618ca0c
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-BEADS-073: Blocked epic on the Gantt', async ({ page, ev }) => {
  // Precondition: alpha's m1 has epic e (open) blocked by the open bead a.
  await stubApi(page, {
    projects: ['alpha'],
    milestone: { m1: detail([epicPlan('e', { title: 'Epic e', status: 'open', depends_on: [] })], { id: 'm1', title: 'Milestone m1' }) },
    beads: [
      bead('e', { title: 'Epic e', issue_type: 'epic', status: 'open', milestone: 'm1', blocked: true, blocked_by: ['a'], dependency_count: 1 }),
      bead('a', { title: 'Bead a', status: 'open', milestone: 'm1', dependent_count: 1, ready: true }),
    ],
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones/alpha/m1', async () => {
    await page.goto('/milestones/alpha/m1');
    await expect(page.getByRole('figure', { name: 'Schedule' })).toBeVisible();
  });

  await ev.step('3. Select the Gantt tab', async () => {
    await page.getByRole('tab', { name: 'Gantt' }).click();
    const row = page.getByRole('figure', { name: 'Schedule' }).locator('[data-epic="e"]');
    await expect(row.getByRole('img', { name: 'Blocked' })).toBeVisible();
    await expect(row.getByRole('img', { name: 'Open' })).toHaveCount(0);
    await expect(row.getByRole('img', { name: 'Ready' })).toHaveCount(0);
  });
});
