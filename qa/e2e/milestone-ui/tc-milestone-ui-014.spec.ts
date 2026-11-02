// TC: TC-MILESTONE-UI-014@2ed462d6
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-014: No kick-start picker for a closed milestone', async ({ page, ev }) => {
  // Precondition: closed milestone M1.
  await stubApi(page, {
    milestone: {
      M1: detail([epicPlan('A', { title: 'Epic A', status: 'closed' })], { id: 'M1', title: 'Alpha launch', status: 'closed' }),
    },
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('heading', { name: 'Alpha launch' })).toBeVisible();
    await expect(page.getByText('Epic A').first()).toBeVisible(); // the Gantt has drawn, so the picker would be there by now
    await expect(page.getByLabel('Kick-start date')).toHaveCount(0);
  });
});
