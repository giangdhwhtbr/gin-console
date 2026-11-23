// TC: TC-UI-344@1df8e054
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-344: Current milestone named in the URL (REQ-UI-143)', async ({ page, ev }) => {
  // Precondition: project example where ex-m2 is the current milestone; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], milestoneOptions: options, beads: [bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2' })] });

  await ev.step('1. Open `/beads?project=example&milestone=ex-m2`', async () => {
    await page.goto('/beads?project=example&milestone=ex-m2');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Milestone Checkout v2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'More filters', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assignee', exact: true })).toBeVisible();
  });
});
