// TC: TC-UI-040@57d98644
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-040: All and No milestone (REQ-UI-104)', async ({ page, ev }) => {
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
  const link = (name: string) => page.getByRole('link', { name });

  await ev.step('1. Open `/beads?project=alpha`', async () => {
    await page.goto('/beads?project=alpha');
    await expect(page.getByRole('button', { name: 'Milestone Checkout v2' })).toBeVisible();
    await expect(link('Under m2 one')).toBeVisible();
  });

  await ev.step('2. Open the Milestone chip and choose `radio "All"` in `radiogroup "Milestone"`', async () => {
    await page.getByRole('button', { name: 'Milestone Checkout v2' }).click();
    await page.getByRole('radiogroup', { name: 'Milestone' }).getByRole('radio', { name: 'All' }).check();
    await expect(page).toHaveURL(/[?&]milestone=all(&|$)/);
    for (const t of ['Under m2 one', 'Under m2 two', 'Under m3', 'Under none']) await expect(link(t)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Milestone', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Milestone filter' })).toHaveCount(0);
    // the menu stays open after a choice: close it so step 3 opens it again
    await page.keyboard.press('Escape');
    await expect(page.getByRole('radiogroup', { name: 'Milestone' })).toHaveCount(0);
  });

  await ev.step('3. Open `button "Milestone"` and choose `radio "No milestone"` in `radiogroup "Milestone"`', async () => {
    await page.getByRole('button', { name: 'Milestone', exact: true }).click();
    await page.getByRole('radiogroup', { name: 'Milestone' }).getByRole('radio', { name: 'No milestone' }).check();
    await expect(page).toHaveURL(/[?&]milestone=none(&|$)/);
    await expect(link('Under none')).toBeVisible();
    for (const t of ['Under m2 one', 'Under m2 two', 'Under m3']) await expect(link(t)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Milestone No milestone' })).toBeVisible();
  });
});
