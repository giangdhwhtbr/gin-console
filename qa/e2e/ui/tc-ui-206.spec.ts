// TC: TC-UI-206@68d9ad7b
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-206: Sort by a column (REQ-UI-121)', async ({ page, ev }) => {
  // Precondition: ex-e12 has 8 tracks in different states.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const table = page.getByRole('region', { name: 'Tracks' }).getByRole('table');
  const titles = table.getByRole('cell', { name: /^Track \d$/ });
  const header = table.getByRole('columnheader', { name: 'State' });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    await expect(titles).toHaveCount(8);
  });

  await ev.step('2. Activate the header "State" of the Tracks table', async () => {
    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    // done (1, 3, 5, 6), in progress (2), ready (7, 8), blocked (4)
    await expect(titles).toHaveText(['Track 1', 'Track 3', 'Track 5', 'Track 6', 'Track 2', 'Track 7', 'Track 8', 'Track 4']);
  });

  await ev.step('3. Activate the header "State" again', async () => {
    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect(titles).toHaveText(['Track 4', 'Track 7', 'Track 8', 'Track 2', 'Track 1', 'Track 3', 'Track 5', 'Track 6']);
  });
});
