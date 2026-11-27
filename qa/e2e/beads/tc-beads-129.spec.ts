// TC: TC-BEADS-129@cba759a5
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { attachment, image, stubBeadWithImages } from '../support/images';

const A = 'a1'.repeat(32);

test('TC-BEADS-129: Open original link of an attachment (REQ-BEADS-030)', async ({ page, ev }) => {
  // Precondition: bug a-1 of alpha with image 2 the attachment A served as an attachment.
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 2 }), [
    image(1, 'qa/evidence/r1/01.png'),
    attachment(2, A, { caption: 'Step 2' }),
  ]);

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(page.getByRole('region', { name: 'Images (2)' })).toBeVisible();
  });

  await ev.step('2. Focus tile 2 of the Images panel and press Enter', async () => {
    await page.getByRole('region', { name: 'Images (2)' }).getByRole('button').nth(1).focus();
    await page.keyboard.press('Enter');
    const link = page.getByRole('dialog').getByRole('link', { name: 'Open original' });
    await expect(link).toHaveAttribute('href', `/api/beads/alpha/a-1/attachments/${A}`);
  });
});
