// TC: TC-UI-195@0b60f7c7
import { test, expect } from '../evidence';
import { E12, PROJECT, scaleOf, stubExample, tall } from '../support/lanes';

test('TC-UI-195: Fit a tall graph (REQ-UI-077)', async ({ page, ev }) => {
  // Precondition: a graph narrower than the canvas and taller than the 1920x1080 window: ex-e12 with "Show closed" on and more tracks without a lane.
  await stubExample(page, tall());
  await page.setViewportSize({ width: 1920, height: 1080 });

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`);
    const canvas = page.getByTestId('graph-canvas');
    await expect(canvas).toBeVisible();
    expect(await canvas.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  });

  await ev.step('2. Press "Fit to view"', async () => {
    // the three Zoom out clicks are setup: Fit to view has something to undo
    await page.getByRole('button', { name: 'Zoom out' }).click({ clickCount: 3 });
    await expect.poll(() => scaleOf(page)).toBeLessThan(1);
    await page.getByRole('button', { name: 'Fit to view' }).click();
    // the scale reads 100%: the graph is narrower than the canvas
    await expect(page.getByRole('group', { name: 'Zoom' })).toContainText('100%');
    // the page scrolls to show the rest of the graph: poll until the layout has settled and the canvas bottom is in the window
    const canvas = page.getByTestId('graph-canvas');
    await expect
      .poll(async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const b = await canvas.boundingBox();
        return b === null ? Infinity : b.y + b.height;
      })
      .toBeLessThanOrEqual(1081);
    const at = await page.evaluate(() => ({ y: window.scrollY, bottom: window.scrollY + window.innerHeight, height: document.documentElement.scrollHeight }));
    expect(at.y).toBeGreaterThan(0);
    expect(at.bottom).toBeGreaterThanOrEqual(at.height - 1);
    const last = await page.locator('[data-node]').last().boundingBox();
    expect(last === null ? Infinity : last.y).toBeLessThan(1080);
  });
});
