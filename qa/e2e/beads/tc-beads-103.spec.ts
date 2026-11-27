// TC: TC-BEADS-103@bb86ea70
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { image, stubBeadWithImages } from '../support/images';

test('TC-BEADS-103: Open original link (REQ-BEADS-030)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha with available image 1.
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 1 }), [image(1, 'qa/evidence/r1/01.png')]);

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(page.getByRole('region', { name: 'Images (1)' })).toBeVisible();
  });

  await ev.step('2. Focus tile 1 of the Images panel and press Enter', async () => {
    await page.getByRole('region', { name: 'Images (1)' }).getByRole('button').first().focus();
    await page.keyboard.press('Enter');
    const link = page.getByRole('dialog').getByRole('link', { name: 'Open original' });
    await expect(link).toHaveAttribute('href', '/api/beads/alpha/a-1/images/1');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
