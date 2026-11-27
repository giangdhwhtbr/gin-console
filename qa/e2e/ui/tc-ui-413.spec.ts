// TC: TC-UI-413@ef537ec8
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { image, stubBeadWithImages } from '../support/images';

test('TC-UI-413: Bead image inline (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha whose description holds `![Step 1](qa/evidence/r1/01.png)`; its image 1 is that file, available.
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 1 }), [image(1, 'qa/evidence/r1/01.png', { caption: 'Step 1' })], {
    description: 'Steps\n\n![Step 1](qa/evidence/r1/01.png)',
  });
  const inline = () => page.locator('.markdown').getByRole('img', { name: 'Step 1' });

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(inline()).toHaveAttribute('src', '/api/beads/alpha/a-1/images/1');
    await expect(inline()).toBeVisible();
    await expect.poll(() => inline().evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  });

  await ev.step('2. Click the image in the description', async () => {
    await inline().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'Step 1' })).toHaveAttribute('src', '/api/beads/alpha/a-1/images/1');
  });
});
