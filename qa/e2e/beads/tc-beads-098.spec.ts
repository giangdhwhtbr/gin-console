// TC: TC-BEADS-098@5fbc3719
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { image, stubBeadWithImages } from '../support/images';

test('TC-BEADS-098: Images panel with a missing image (REQ-BEADS-029)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha with image 1 available (01.png) and image 2 not available (/tmp/x.png).
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 1 }), [
    image(1, 'qa/evidence/r1/01.png'),
    image(2, '/tmp/x.png', { available: false }),
  ]);

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    const panel = page.getByRole('region', { name: 'Images (2)' });
    await expect(panel).toBeVisible();
    const tiles = panel.getByRole('listitem');
    await expect(tiles).toHaveCount(2);
    await expect(tiles.nth(0).getByRole('img', { name: '01.png' })).toHaveAttribute('src', '/api/beads/alpha/a-1/images/1');
    await expect(tiles.nth(1)).toContainText('Not on this host');
    await expect(tiles.nth(1)).toContainText('/tmp/x.png');
    await expect(tiles.nth(1).getByRole('img')).toHaveCount(0);
  });
});
