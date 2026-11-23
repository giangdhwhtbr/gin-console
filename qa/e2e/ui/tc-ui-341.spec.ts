// TC: TC-UI-341@d170c8e7
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-341: Nothing to clear (REQ-UI-143)', async ({ page, ev }) => {
  // Precondition: project example has current milestone ex-m2; no milestone and no other filter in the URL; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], milestoneOptions: options, beads: [bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2' })] });

  await ev.step('1. Open `/beads?project=example`', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Milestone Checkout v2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
  });
});
