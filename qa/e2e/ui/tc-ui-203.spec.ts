// TC: TC-UI-203@a44547fd
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-203: Lanes summary (REQ-UI-121)', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra and qa; the first open track of qa waits for be #2 (merge pending) and fe #3 (merged); qa has 0 of 1 tracks closed.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const section = page.getByRole('region', { name: 'Lanes' });
    const rows = section.getByRole('listitem');
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toHaveAttribute('data-lane', 'be');
    await expect(rows.nth(1)).toHaveAttribute('data-lane', 'fe');
    await expect(rows.nth(2)).toHaveAttribute('data-lane', 'infra');
    await expect(rows.nth(3)).toHaveAttribute('data-lane', 'qa');
    // every row names its state
    for (const [i, words] of ['Running', 'All tracks closed', 'All tracks closed', 'Waiting for be'].entries()) await expect(rows.nth(i)).toContainText(words);
    const qa = rows.nth(3);
    await expect(qa).toContainText('waits for be #2 (merge pending), fe #3 (merged)');
    await expect(qa.locator('[data-strand="0/1"]')).toContainText('0/1');
    await expect(qa).not.toContainText('closed');
    await expect(section.getByRole('link', { name: /^Open the Lanes tab/ })).toBeVisible();
  });
});
