// TC: TC-BEADS-102@eb62a498
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { image, stubBeadWithImages } from '../support/images';

test('TC-BEADS-102: Lightbox closes on Escape (REQ-BEADS-030)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha with available image 1.
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 1 }), [image(1, 'qa/evidence/r1/01.png')]);
  const dialog = page.getByRole('dialog');
  const tile = () => page.getByRole('region', { name: 'Images (1)' }).getByRole('button').first();

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(tile()).toBeVisible();
  });

  await ev.step('2. Focus tile 1 of the Images panel and press Enter', async () => {
    await tile().focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
  });

  await ev.step('3. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(tile()).toBeFocused();
  });
});
