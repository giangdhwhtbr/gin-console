// TC: TC-UI-042@22e5e21d
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-042: No current milestone (REQ-UI-104)', async ({ page, ev }) => {
  // Precondition: alpha's milestones are all closed; open beads under no milestone.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['alpha'],
    milestoneOptions: { milestones: [milestoneOption('m1', { title: 'Alpha launch', status: 'closed' })], current: null },
    beads: [bead('a-1', { title: 'Loose one' }), bead('a-2', { title: 'Loose two' })],
  });

  await ev.step('1. Open `/beads?project=alpha`', async () => {
    await page.goto('/beads?project=alpha');
    await expect(page.getByRole('link', { name: 'Loose one' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Loose two' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Milestone', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Milestone filter' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Milestone \S/ })).toHaveCount(0);
  });
});
