// TC: TC-BEADS-101@faf44ed4
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { image, stubBeadWithImages } from '../support/images';

test('TC-BEADS-101: Lightbox steps through available images (REQ-BEADS-030)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha with available images 1 and 3 and a missing image 2.
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 2 }), [
    image(1, 'qa/evidence/r1/01.png'),
    image(2, '/tmp/gone.png', { available: false }),
    image(3, 'qa/evidence/r1/03.png'),
  ]);
  const dialog = page.getByRole('dialog');

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(page.getByRole('region', { name: 'Images (3)' })).toBeVisible();
  });

  await ev.step('2. Focus tile 1 of the Images panel and press Enter', async () => {
    const tile = page.getByRole('region', { name: 'Images (3)' }).getByRole('button').first();
    await tile.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '01.png' })).toBeVisible();
    await expect(dialog.getByText('1 of 2')).toBeVisible();
  });

  await ev.step('3. Press →', async () => {
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('heading', { name: '03.png' })).toBeVisible();
    await expect(dialog.getByText('2 of 2')).toBeVisible();
  });

  await ev.step('4. Press → again', async () => {
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('heading', { name: '03.png' })).toBeVisible();
    await expect(dialog.getByText('2 of 2')).toBeVisible();
  });

  await ev.step('5. Press ←', async () => {
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.getByRole('heading', { name: '01.png' })).toBeVisible();
    await expect(dialog.getByText('1 of 2')).toBeVisible();
  });
});
