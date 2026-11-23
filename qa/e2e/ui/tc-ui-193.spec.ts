// TC: TC-UI-193@3d195f4a
import { test, expect } from '../evidence';
import { E12, PROJECT, scrolled, stubExample } from '../support/lanes';

test('TC-UI-193: Wheel over the Graph view (REQ-UI-122)', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra, qa and two tracks without a lane; the window is 1440x800 (the page no longer overflows 900) and the page is taller than it.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 800 });

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all&view=graph&scope=${E12}&closed=1`);
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
    expect((await scrolled(page, 'graph-canvas')).y).toBe(0);
  });

  await ev.step('2. Put the pointer over a lane box', async () => {
    const lane = (await page.getByRole('region', { name: 'Lane be' }).boundingBox())!;
    await page.mouse.move(lane.x + lane.width / 2, lane.y + lane.height / 2);
  });

  await ev.step('3. Turn the wheel down', async () => {
    await page.mouse.wheel(0, 600);
    await expect.poll(async () => (await scrolled(page, 'graph-canvas')).y).toBeGreaterThan(0);
    const after = await scrolled(page, 'graph-canvas');
    // the canvas does not scroll vertically
    expect(after.top).toBe(0);
    expect(after.over).toBe('hidden');
  });
});
