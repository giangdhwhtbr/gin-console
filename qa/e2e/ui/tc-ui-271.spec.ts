// TC: TC-UI-271@fd0ead7e
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-UI-271: Progress on the Gantt row', async ({ page, ev }) => {
  // Precondition: epic e-1 has 5 tracks, 3 closed, in milestone m1 of project alpha; "Show closed" is off.
  await stubApi(page, {
    projects: ['alpha'],
    milestone: { m1: detail([epicPlan('e-1', { title: 'Epic one' })], { id: 'm1' }) },
    beads: [
      bead('e-1', { issue_type: 'epic', milestone: 'm1', child_counts: { total: 5, closed: 3, prep_total: 0, prep_closed: 0 } }),
    ],
  });

  await ev.step('1. Open `/milestones/alpha/m1`', async () => {
    await page.goto('/milestones/alpha/m1');
    const strand = page.locator('[data-epic="e-1"]').locator('[data-strand="3/5"]').first();
    await expect(strand).toBeVisible();
    await expect(strand).toContainText('3/5');
  });
});
