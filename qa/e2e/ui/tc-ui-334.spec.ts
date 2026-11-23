// TC: TC-UI-334@80fa7a3d
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-334: Milestone counted only when changed (REQ-UI-084)', async ({ page, ev }) => {
  // Precondition: project example at 390px with a current milestone; ?project=example&milestone=all&priority=1.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, {
    projects: ['example'],
    milestoneOptions: options,
    beads: [bead('ex-1', { title: 'Pay invoice', priority: 1, milestone: 'ex-m2' }), bead('ex-2', { title: 'Ship cart', priority: 2, milestone: 'ex-m2' })],
  });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&milestone=all&priority=1');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    const filters = page.getByRole('button', { name: /^Filters\b/ });
    await expect(filters).toBeVisible();
    await expect(filters).toHaveAccessibleName('Filters 2');
  });
});
