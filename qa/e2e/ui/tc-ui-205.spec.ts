// TC: TC-UI-205@e5603827
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-205: Tracks table (REQ-UI-121)', async ({ page, ev }) => {
  // Precondition: ex-e12 has 8 tracks and a merge gate child; ex-e12.4 is blocked by the merge gate that waits for track 2 of lane be.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const table = page.getByRole('region', { name: 'Tracks' }).getByRole('table');
    const rows = table.getByRole('row').filter({ has: page.getByRole('cell') });
    await expect(rows).toHaveCount(8);
    await expect(rows.getByRole('cell', { name: /^Track \d$/ })).toHaveText(['Track 1', 'Track 2', 'Track 3', 'Track 4', 'Track 5', 'Track 6', 'Track 7', 'Track 8']);
    await expect(table.getByRole('row', { name: /Waits for/ })).toHaveCount(0);
    const four = rows.filter({ hasText: 'Track 4' });
    await expect(four).toHaveCount(1);
    const cells = four.getByRole('cell');
    await expect(cells.nth(2)).toHaveText('Blocked');
    await expect(cells.nth(3)).toHaveText('qa');
    await expect(cells.nth(4)).toHaveText('Unassigned');
    await expect(cells.nth(6)).toHaveText('be #2 · merge pending');
  });
});
