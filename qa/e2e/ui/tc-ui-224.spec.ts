// TC: TC-UI-224@3552d07a
import { test, expect } from '../evidence';
import { PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-224: No Lanes tab without lanes (REQ-UI-119)', async ({ page, ev }) => {
  // Precondition: ex-e3 has tracks without a lane.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/ex-e3?tab=lanes`, async () => {
    await page.goto(`/beads/${PROJECT}/ex-e3?tab=lanes`);
    const tabs = page.getByRole('tablist', { name: 'Epic views' }).getByRole('tab');
    await expect(tabs).toHaveText(['Overview', 'Graph', /^Discussion/]);
    await expect(page.getByRole('tab', { name: 'Lanes' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('region', { name: 'Tracks' })).toBeVisible();
  });
});
