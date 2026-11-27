// TC: TC-BEADS-100@21a68add
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { image, stubBeadWithImages } from '../support/images';

test('TC-BEADS-100: Images panel at 390px (REQ-BEADS-029)', async ({ page, ev }) => {
  // Precondition: bug a-1 of project alpha with 3 images, 2 available and 1 not, the last with a path of 120 characters; the window is 390px wide.
  const longPath = `/srv/attachments/${'x'.repeat(100)}.png`;
  await stubBeadWithImages(page, 'alpha', bead('a-1', { issue_type: 'bug', image_count: 2 }), [
    image(1, 'qa/evidence/r1/01.png'),
    image(2, 'qa/evidence/r1/02.png'),
    image(3, longPath, { available: false }),
  ]);
  await page.setViewportSize({ width: 390, height: 800 });

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    const panel = page.getByRole('region', { name: 'Images (3)' });
    await expect(panel.getByRole('listitem')).toHaveCount(3);
    await expect(panel.getByText(longPath)).toBeVisible();
    await expect(panel.getByRole('img', { name: '02.png' })).toBeVisible();
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
  });
});
