// TC: TC-UI-194@050006ac
import { test, expect } from '../evidence';
import { E12, PROJECT, scrolled, stubExample } from '../support/lanes';

test('TC-UI-194: Sideways scroll of the canvas (REQ-UI-122)', async ({ page, ev }) => {
  // Precondition: the Graph view of ex-e12 with "Show closed" on at 390x844 is wider than the window.
  await stubExample(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`);
    const canvas = page.getByTestId('graph-canvas');
    await expect(canvas).toBeVisible();
    // Fit to view is on the width at the start, so the user zooms back to 100% to get a graph wider than the window
    await page.getByRole('button', { name: 'Zoom in' }).click({ clickCount: 8 });
    await expect.poll(() => canvas.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 120));
    await expect.poll(async () => (await scrolled(page, 'graph-canvas')).y).toBeGreaterThan(0);
  });

  await ev.step('2. Scroll sideways over the canvas', async () => {
    const before = await scrolled(page, 'graph-canvas');
    const box = (await page.getByTestId('graph-canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 100, 800));
    await page.mouse.wheel(150, 0);
    // the canvas moves sideways
    await expect.poll(async () => (await scrolled(page, 'graph-canvas')).left).toBeGreaterThan(0);
    // the page does not move
    const after = await scrolled(page, 'graph-canvas');
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(after.top).toBe(0);
  });
});
