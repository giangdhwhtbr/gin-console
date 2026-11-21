// TC: TC-UI-226@47aaafb8
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-226: Progress by state (REQ-UI-120)', async ({ page, ev }) => {
  // Precondition: ex-e12 has 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const card = page.getByRole('region', { name: 'Progress' });
    await expect(card).toContainText('4 of 8 tracks closed · 50%');
    const legend = card.getByRole('listitem');
    await expect(legend).toHaveText(['Done 4', 'In progress 1', 'Ready 2', 'Blocked 1']);
  });
});
