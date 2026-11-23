// TC: TC-UI-336@3914cc60
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-336: No Filters button on a wide window (REQ-UI-084)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example at 1024px.
  await page.setViewportSize({ width: 1024, height: 768 });
  await stubApi(page, { projects: ['example'], milestoneOptions: options, beads: [bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2' })] });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Filters\b/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'More filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Status' })).toBeVisible();
  });
});
