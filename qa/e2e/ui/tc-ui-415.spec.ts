// TC: TC-UI-415@70fd1538
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { image, stubBeadWithImages } from '../support/images';

test('TC-UI-415: Link to a bead image (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha whose description holds `[BUG-5.png](file:///srv/att/BUG-5.png)`; its image 1 is that file, available.
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 1 }), [image(1, '/srv/att/BUG-5.png')], {
    description: '[BUG-5.png](file:///srv/att/BUG-5.png)',
  });

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(page.locator('.markdown').getByRole('button', { name: 'BUG-5.png' })).toBeVisible();
  });

  await ev.step('2. Activate "BUG-5.png"', async () => {
    await page.locator('.markdown').getByRole('button', { name: 'BUG-5.png' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'BUG-5.png' })).toHaveAttribute('src', '/api/beads/alpha/a-1/images/1');
    await expect(dialog.getByText('1 of 1')).toBeVisible();
  });
});
