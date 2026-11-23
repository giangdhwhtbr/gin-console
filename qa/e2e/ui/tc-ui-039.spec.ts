// TC: TC-UI-039@b211c0cf
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-039: Default to the current milestone (REQ-UI-104)', async ({ page, ev }) => {
  // Precondition: alpha's current milestone is m2; open beads under m2, under planned m3, and one under no milestone.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['alpha'],
    milestoneOptions: {
      milestones: [
        milestoneOption('m2', { title: 'Checkout v2', status: 'active' }),
        milestoneOption('m3', { title: 'Search v3', status: 'planned' }),
      ],
      current: 'm2',
    },
    beads: [
      bead('a-1', { title: 'Under m2 one', milestone: 'm2' }),
      bead('a-2', { title: 'Under m2 two', milestone: 'm2' }),
      bead('a-3', { title: 'Under m3', milestone: 'm3' }),
      bead('a-4', { title: 'Under none', milestone: null }),
    ],
  });

  await ev.step('1. Open `/beads?project=alpha`', async () => {
    await page.goto('/beads?project=alpha');
    await expect(page.getByRole('link', { name: 'Under m2 one' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Under m2 two' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Under m3' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Under none' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Milestone Checkout v2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Milestone filter' })).toBeVisible();
  });
});
