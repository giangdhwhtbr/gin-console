// TC: TC-UI-192@8af227e3
import { test, expect } from '../evidence';
import { E12, PROJECT, scrolled, stubExample } from '../support/lanes';

test('TC-UI-192: Wheel over the Lanes view (REQ-UI-122)', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra, qa and two tracks without a lane; the window is 1440x900.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all&view=lanes&scope=${E12}`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all&view=lanes&scope=${E12}`);
    await expect(page.getByTestId('lanes-canvas')).toBeVisible();
    // the page is taller than the window, so that it can scroll
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  });

  await ev.step('2. Scroll the page to the top', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    expect((await scrolled(page, 'lanes-canvas')).y).toBe(0);
  });

  await ev.step('3. Put the pointer over the cards', async () => {
    const card = (await page.getByTestId('lanes-canvas').locator('[data-node]').first().boundingBox())!;
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  });

  await ev.step('4. Turn the wheel down', async () => {
    await page.mouse.wheel(0, 600);
    await expect.poll(async () => (await scrolled(page, 'lanes-canvas')).y).toBeGreaterThan(0);
    const after = await scrolled(page, 'lanes-canvas');
    // the canvas has no vertical scroll bar and stays at the top
    expect(after.top).toBe(0);
    expect(after.over).toBe('hidden');
    expect(await page.getByTestId('lanes-canvas').evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  });
});
