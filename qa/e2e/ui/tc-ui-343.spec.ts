// TC: TC-UI-343@ea34c085
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

import { stubDetails } from '../support/lanes';

test('TC-UI-343: Clear filters returns to the current milestone (REQ-UI-143)', async ({ page, ev }) => {
  // Precondition: project example, current milestone ex-m2 "Checkout v2"; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  const beads = [
    bead('ex-e3', { title: 'Pay the invoice', issue_type: 'epic', priority: 1, labels: ['ui'], milestone: 'ex-m2' }),
    bead('ex-e4', { title: 'Other work', priority: 2, milestone: null }),
  ];
  await stubApi(page, { projects: ['example'], milestoneOptions: options, beads });
  await stubDetails(page, beads);

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&milestone=all&q=pay&status=open&priority=1&label=ui&label_mode=all&closed=1&view=board&select=ex-e3');
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Milestone', exact: true })).toBeVisible();
  });

  await ev.step('2. Click `button "Clear filters"`', async () => {
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/beads?project=example&closed=1&view=board&select=ex-e3');
    await expect(page.getByRole('button', { name: 'Milestone Checkout v2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
  });
});
