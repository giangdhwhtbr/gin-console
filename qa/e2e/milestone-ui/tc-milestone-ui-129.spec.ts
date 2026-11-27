// TC: TC-MILESTONE-UI-129@fe543b1f
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';
import { axisHeader } from '../support/timeline';

test('TC-MILESTONE-UI-129: Weeks across a year end', async ({ page, ev }) => {
  // Precondition: one open milestone from 21 Dec 2026 to 15 Jan 2027 and no other bar; today is 21 Dec 2026.
  await stubApi(page, {
    projects: ['example'],
    milestones: list([entry('m1', { title: 'Winter release', status: 'active', start: '2026-12-21', end: '2027-01-15', finish: null })], { today: '2026-12-21' }),
  });

  await ev.step('1. Open /milestones?project=example&zoom=weeks', async () => {
    await page.goto('/milestones?project=example&zoom=weeks');
    for (const label of ['21 Dec', '28 Dec', '4 Jan', '11 Jan']) {
      await expect(axisHeader(page).getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator('[data-weekend]')).toHaveCount(6);
  });
});
