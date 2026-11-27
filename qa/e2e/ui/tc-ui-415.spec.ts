// TC: TC-UI-415@96abb765
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { attachment, image, stubBeadWithImages } from '../support/images';

const A = 'a1'.repeat(32);

test('TC-UI-415: Link to a bead image (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha whose description holds `[BUG-5.png](file:///srv/att/BUG-5.png)` (image 1, available) and `[shot](attachment:A)` (image 2, available).
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 2 }), [
    image(1, '/srv/att/BUG-5.png'),
    attachment(2, A, { caption: 'shot' }),
  ], {
    description: `[BUG-5.png](file:///srv/att/BUG-5.png)\n\n[shot](attachment:${A})`,
  });
  const dialog = page.getByRole('dialog');

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(page.locator('.markdown').getByRole('button', { name: 'BUG-5.png' })).toBeVisible();
    await expect(page.locator('.markdown').getByRole('button', { name: 'shot' })).toBeVisible();
  });

  await ev.step('2. Activate "BUG-5.png"', async () => {
    await page.locator('.markdown').getByRole('button', { name: 'BUG-5.png' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'BUG-5.png' })).toHaveAttribute('src', '/api/beads/alpha/a-1/images/1');
    await expect(dialog.getByText('1 of 2')).toBeVisible();
  });

  await ev.step('3. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  await ev.step('4. Activate "shot"', async () => {
    await page.locator('.markdown').getByRole('button', { name: 'shot' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'shot' })).toHaveAttribute('src', `/api/beads/alpha/a-1/attachments/${A}`);
    await expect(dialog.getByText('2 of 2')).toBeVisible();
  });
});
