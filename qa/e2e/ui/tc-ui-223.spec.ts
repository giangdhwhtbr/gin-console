// TC: TC-UI-223@fe8aedb7
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-223: Tab in the URL (REQ-UI-119)', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra and qa.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  await ev.step('2. Choose the tab "Graph"', async () => {
    await page.getByRole('tab', { name: 'Graph' }).click();
    await expect(page).toHaveURL(`/beads/${PROJECT}/${E12}?tab=graph`);
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Graph' })).toHaveAttribute('aria-selected', 'true');
    // the scope is the epic: its tracks are drawn, the epic itself is not
    await expect(page.locator('[data-node]').first()).toBeVisible();
    await expect(page.locator(`[data-node="${E12}"]`)).toHaveCount(0);
    // the search and the filters of the Beads views
    await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Show closed' })).toBeVisible();
  });
});
