// TC: TC-BEADS-099@9cbf95d9
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-BEADS-099: Bead without images has no panel (REQ-BEADS-029)', async ({ page, ev }) => {
  // Precondition: task t-1 of project alpha whose images is empty.
  await stubBeadWithImages(page, 'alpha', bead('t-1'), []);

  await ev.step('1. Open `/beads/alpha/t-1`', async () => {
    await page.goto('/beads/alpha/t-1');
    await expect(page.getByRole('heading', { name: 'Title t-1' })).toBeVisible();
    await expect(page.getByText('A description')).toBeVisible();
    await expect(page.getByRole('region', { name: /^Images/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Images/ })).toHaveCount(0);
  });
});
