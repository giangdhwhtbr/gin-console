// TC: TC-UI-221@d00d79ca
import { test, expect } from '../evidence';
import { E12, PROJECT, scaleOf, scrolled, settled } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-221: Wheel over the Graph tab of an epic (REQ-UI-122)', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra and qa, and two tracks without a lane; the window is 1440x900 and the page is taller than the window.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}?tab=graph&closed=1`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}?tab=graph&closed=1`);
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Lane be' })).toBeVisible();
    await expect.poll(() => scaleOf(page)).toBeGreaterThan(0);
    await settled(page);
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
