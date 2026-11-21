// TC: TC-UI-204@bba4247b
import { test, expect } from '../evidence';
import { PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-204: No lanes section (REQ-UI-121)', async ({ page, ev }) => {
  // Precondition: ex-e3 has tracks without a lane.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/ex-e3`, async () => {
    await page.goto(`/beads/${PROJECT}/ex-e3`);
    await expect(page.getByRole('region', { name: 'Tracks' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Lanes' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Lanes' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Tracks' }).locator('[data-swatch]')).toHaveCount(0);
  });
});
