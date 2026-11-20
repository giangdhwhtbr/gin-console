// TC: TC-UI-157@d7e55bb8
import { test, expect } from '../evidence';
import { E12, stubExample } from '../support/lanes';

test('TC-UI-157: Lanes rows and columns', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be (tracks 1, 2; 2 blocked by 1), fe (3), qa (4, blocked by merge gates for tracks 2 and 3), infra (5, 6) and two children without a lane.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    const canvas = page.getByTestId('lanes-canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas.getByRole('heading', { level: 3 })).toHaveText(['be', 'fe', 'infra', 'qa', 'No lane']);
    const x = async (n: number) => (await page.locator(`[data-node="${E12}.${n}"]`).boundingBox())!.x;
    expect(await x(2)).toBeGreaterThan(await x(1));
    expect(await x(4)).toBeGreaterThan(await x(2));
    expect(await x(4)).toBeGreaterThan(await x(3));
  });
});
