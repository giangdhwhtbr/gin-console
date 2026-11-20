// TC: TC-UI-197@b5b19a70
import { test, expect } from '../evidence';
import { E12, PROJECT, scaleOf, stubExample } from '../support/lanes';

test('TC-UI-197: Fit a wide graph (REQ-UI-077)', async ({ page, ev }) => {
  // Precondition: the Graph view of ex-e12 with "Show closed" on at 390x844; the graph is wider than the canvas.
  await stubExample(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const wholeWidth = async () => {
    const canvas = page.getByTestId('graph-canvas');
    await expect.poll(() => canvas.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // the right edge of the last lane box is inside the canvas
    const frame = (await canvas.boundingBox())!;
    const right = await page.locator('section[data-lane]').evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(frame.x + frame.width + 1);
    expect(await scaleOf(page)).toBeLessThan(1);
  };

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`);
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    await wholeWidth();
  });

  await ev.step('2. Press "Fit to view"', async () => {
    await page.getByRole('button', { name: 'Zoom in' }).click({ clickCount: 3 });
    await expect.poll(() => page.getByTestId('graph-canvas').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Fit to view' }).click();
    await wholeWidth();
  });
});
