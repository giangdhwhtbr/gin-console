// TC: TC-UI-199@c75fd1ec
import { test, expect } from '../evidence';
import { E12, PROJECT, factOf } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-199: Points (REQ-UI-120)', async ({ page, ev }) => {
  // Precondition: ex-e12 has tracks of points 3 (closed), 5 (in progress) and 3 (closed), and tracks without points.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const progress = page.getByRole('region', { name: 'Progress' });
    await expect(factOf(progress, 'Points')).toHaveText('6 of 11 pt done');
  });
});
