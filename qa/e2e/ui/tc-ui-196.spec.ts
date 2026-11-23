// TC: TC-UI-196@a9c5f0e3
import { test, expect } from '../evidence';
import { E12, PROJECT, stubExample } from '../support/lanes';

test('TC-UI-196: No panel on opening an epic (REQ-UI-106)', async ({ page, ev }) => {
  // Precondition: project example with epic ex-e12 that has children.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}`);
    const canvas = page.getByTestId('graph-canvas');
    await expect(canvas).toBeVisible();
    // the URL has no select
    await expect(page).not.toHaveURL(/[?&]select=/);
    // no details panel, and the graph takes the full width of the page content
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
    const main = (await page.getByRole('main').boundingBox())!;
    const box = (await canvas.boundingBox())!;
    expect(box.x + box.width).toBeGreaterThan(main.x + main.width - 40);
  });

  await ev.step(`2. Click the card of \`${E12}.2\``, async () => {
    await page.locator(`[data-node="${E12}.2"]`).click();
    await expect(page).toHaveURL(new RegExp(`[?&]select=${E12}\\.2(&|$)`));
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Track 2' })).toBeVisible();
  });
});
