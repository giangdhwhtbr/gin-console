// TC: TC-MILESTONE-UI-066@e974c3f4
import { test, expect } from '../evidence';
import { detail, epicPlan, failure, stubApi } from '../support/api';

test('TC-MILESTONE-UI-066: Beads unavailable still draws the Gantt', async ({ page, ev }) => {
  // Precondition: milestone M1 whose GET /api/beads for the project fails.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestone: {
      M1: detail([
        epicPlan('A', { title: 'Epic A', planned_start: '2026-11-02', planned_end: '2026-11-04' }),
        epicPlan('B', { title: 'Epic B', planned_start: '2026-11-05', planned_end: '2026-11-09', depends_on: ['A'] }),
      ]),
    },
    beads: () => failure('bd unavailable'),
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    const schedule = page.getByRole('figure', { name: 'Schedule' });
    const epics = schedule.getByRole('list', { name: 'Epics' }).getByRole('listitem');
    await expect(epics).toHaveCount(2);
    await expect(epics.filter({ hasText: 'Epic A' })).toBeVisible();
    await expect(epics.filter({ hasText: 'Epic B' })).toBeVisible();
    await expect(schedule.locator('[data-bar="A"]')).toBeVisible();
    await expect(schedule.locator('path[data-from="A"][data-to="B"]')).toHaveCount(1);
    await expect(schedule.getByRole('button', { name: /child bead/ })).toHaveCount(0);
    await expect(schedule.locator('[data-bar="B"]')).toBeVisible();
    await expect(schedule.locator('[data-strand]')).toHaveCount(0);
  });
});
