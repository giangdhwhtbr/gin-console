// TC: TC-UI-173@4dbda935
import { test, expect } from '../evidence';
import { stubExample } from '../support/lanes';

test('TC-UI-173: Bead without a lane has no chip', async ({ page, ev }) => {
  // Precondition: a bead has lane null (epic ex-e3 of the example project).
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open the List view', async () => {
    await page.goto('/beads?project=example&milestone=all&view=list');
    const row = page.locator('[data-id="ex-e3"]');
    await expect(row).toBeVisible();
    await expect(row.getByRole('link', { name: 'Billing exports for finance' })).toBeVisible();
    await expect(row.getByTitle(/^Lane /)).toHaveCount(0);
    // the epic that has lanes still shows none of its own: the chip belongs to the tracks
    await expect(page.locator('[data-id="ex-e12"]').getByTitle(/^Lane /)).toHaveCount(0);
  });
});
