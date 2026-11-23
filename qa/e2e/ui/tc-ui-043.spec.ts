// TC: TC-UI-043@ea4c94a3
import { test, expect } from '../evidence';
import { bead, failure, stubApi } from '../support/api';

test('TC-UI-043: Milestones unavailable (REQ-UI-104)', async ({ page, ev }) => {
  // Precondition: alpha has open beads and GET /api/beads/milestones?project=alpha answers 502.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['alpha'],
    milestoneOptions: failure('bd failed'),
    beads: [bead('a-1', { title: 'Open one' }), bead('a-2', { title: 'Open two' })],
  });

  await ev.step('1. Open `/beads?project=alpha`', async () => {
    await page.goto('/beads?project=alpha');
    await expect(page.getByRole('link', { name: 'Open one' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open two' })).toBeVisible();
  });

  await ev.step('2. Open `button "Milestone"`', async () => {
    await page.getByRole('button', { name: 'Milestone', exact: true }).click();
    await expect(page.getByText('Milestones unavailable')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open one' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open two' })).toBeVisible();
  });
});
