// TC: TC-BEADS-128@563bb15a
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { attachment, stubBeadWithImages } from '../support/images';

test('TC-BEADS-128: Image that fails to load shows its caption (REQ-BEADS-029)', async ({ page, ev }) => {
  // Precondition: bug a-1 of alpha with available image 1 whose address answers 404.
  await stubBeadWithImages(
    page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 1 }),
    [attachment(1, 'a1'.repeat(32), { caption: 'Step 1' })],
    { broken: [1] },
  );

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    const tile = page.getByRole('region', { name: 'Images (1)' }).getByRole('listitem').first();
    await expect(tile).toContainText('Step 1');
    await expect(tile.getByRole('img')).toHaveCount(0);
  });
});
