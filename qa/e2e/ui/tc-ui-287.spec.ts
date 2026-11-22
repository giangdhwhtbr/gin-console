// TC: TC-UI-287@400ba4a4
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs, withComments, e12Counted } from '../support/epic';
import { plain } from '../support/lanes';
import type { BeadSummary } from '../support/api';

test('TC-UI-287: Progress with closed beads hidden', async ({ page, ev }) => {
  // Precondition: ex-e12 has 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child; "Show closed" is off.
  const counted = (b: BeadSummary): BeadSummary => (b.id === E12 ? { ...b, child_counts: { total: 8, closed: 4, prep_total: 0, prep_closed: 0 } } : b);
  await openEpicStubs(page, [...withComments(e12Counted()), ...plain()].map(counted));
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads?project=${PROJECT}&milestone=all`, async () => {
    await page.goto(`/beads?project=${PROJECT}&milestone=all`);
    await expect(page.getByText(E12).first()).toBeVisible();
  });

  await ev.step(`2. Click the title of ${E12}`, async () => {
    await page.getByRole('link', { name: 'Team checkout' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/beads/${PROJECT}/${E12}`));
    await expect(page.getByRole('region', { name: 'Progress' })).toContainText('4 of 8 tracks closed · 50%');
  });
});
