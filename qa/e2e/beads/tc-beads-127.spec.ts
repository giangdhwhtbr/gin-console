// TC: TC-BEADS-127@8f6607e7
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { attachment, image, stubBeadWithImages } from '../support/images';

const A = 'a1'.repeat(32);

test('TC-BEADS-127: Images panel with attachments (REQ-BEADS-029)', async ({ page, ev }) => {
  // Precondition: bug a-1 of alpha with an available attachment, a pruned one, one not fetched with a path, and one of the s3 store.
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 1 }), [
    attachment(1, A, { caption: 'Step 1' }),
    attachment(2, 'b2'.repeat(32), { available: false, reason: 'pruned' }),
    { ...image(3, 'qa/evidence/r1/03.png', { available: false }), sha256: 'c3'.repeat(32), served_as: null, reason: 'not_fetched' },
    attachment(4, 'd4'.repeat(32), { available: false, reason: 'unsupported_store' }),
  ]);

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    const panel = page.getByRole('region', { name: 'Images (4)' });
    await expect(panel).toBeVisible();
    const tiles = panel.getByRole('listitem');
    await expect(tiles).toHaveCount(4);
    await expect(tiles.nth(0).getByRole('img', { name: 'Step 1' })).toHaveAttribute('src', `/api/beads/alpha/a-1/attachments/${A}`);
    await expect(tiles.nth(1)).toContainText('Pruned');
    await expect(tiles.nth(2)).toContainText('Not fetched yet');
    await expect(tiles.nth(2)).toContainText('qa/evidence/r1/03.png');
    await expect(tiles.nth(3)).toContainText('Stored where this host cannot read it');
    for (const n of [1, 2, 3]) await expect(tiles.nth(n).getByRole('img')).toHaveCount(0);
  });
});
