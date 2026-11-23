// TC: TC-UI-342@fc022094
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-342: A search is a filter (REQ-UI-143)', async ({ page, ev }) => {
  // Precondition: project example has current milestone ex-m2; the Beads page at 1440px with no filter.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], milestoneOptions: options, beads: [bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2' })] });
  await page.goto('/beads?project=example');
  await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);

  await ev.step('1. Type "pay" into the `searchbox "Search"`', async () => {
    await page.getByRole('searchbox', { name: 'Search' }).fill('pay');
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  });
});
