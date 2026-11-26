// TC: TC-MILESTONE-UI-132@d1b5d987
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { boxOf, historyList, timeline } from '../support/timeline';

test('TC-MILESTONE-UI-132: Show closed adds closed milestones and epics', async ({ page, ev }) => {
  // Precondition: closed ex-m0a, ex-m0b (finish 13 Oct) and ex-m1 with the closed epic ex-e2 (12 Oct to 28 Oct), and the open ex-m2; today is 12 Nov 2026.
  await stubApi(page, { projects: ['example'], milestones: historyList() });

  await ev.step('1. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    await expect(timeline(page).getByRole('link', { name: 'Beta readiness' })).toBeVisible();
  });

  await ev.step('2. Turn on "Show closed"', async () => {
    const chart = timeline(page);
    await chart.getByRole('checkbox', { name: 'Show closed' }).check();
    await expect(page).toHaveURL(/[?&]closed=1(&|$)/);
    await expect(chart.getByRole('link')).toHaveText(['Discovery', 'Prototype', 'Foundations', 'Search relevance', 'Beta readiness', 'Billing exports']);
    await expect(chart.getByText('Finished 13 Oct', { exact: true })).toHaveCount(1);
    const bar = page.getByLabel('Search relevance: 12 Oct – 28 Oct, closed');
    await expect(bar).toHaveClass(/bg-state-done/);
    expect((await boxOf(bar)).width).toBeCloseTo(17 * 6, 0);
  });
});
