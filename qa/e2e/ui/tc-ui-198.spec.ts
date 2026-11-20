// TC: TC-UI-198@92ba2976
import { test, expect } from '../evidence';
import { E12, PROJECT, scaleOf, scrolled, settled, stubExample } from '../support/lanes';

test('TC-UI-198: Wheel zooms only with Ctrl (REQ-UI-077)', async ({ page, ev }) => {
  // Precondition: the Graph view of ex-e12 with "Show closed" on at 1440x900, where the page is taller than the window.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  let before = 1;

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`);
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
    await settled(page);
    before = await scaleOf(page);
  });

  await ev.step('2. Put the pointer over the canvas', async () => {
    const box = (await page.getByTestId('graph-canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 100);
  });

  await ev.step('3. Turn the wheel with `Ctrl` held', async () => {
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await expect.poll(() => scaleOf(page)).not.toBe(before);
    expect((await scrolled(page, 'graph-canvas')).y).toBe(0);
    await settled(page);
    before = await scaleOf(page);
  });

  await ev.step('4. Turn the wheel down without `Ctrl`', async () => {
    await page.mouse.wheel(0, 600);
    await expect.poll(async () => (await scrolled(page, 'graph-canvas')).y).toBeGreaterThan(0);
    expect(await scaleOf(page)).toBe(before);
    expect((await scrolled(page, 'graph-canvas')).top).toBe(0);
  });
});
