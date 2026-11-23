// TC: TC-UI-357@4eab3e97
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-357: No hint on a phone (REQ-UI-146)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example at 390px wide.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1')] });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example');
    const search = page.getByRole('searchbox', { name: 'Search' });
    await expect(search).toBeVisible();
    await expect(search.locator('xpath=..').locator('kbd')).toBeHidden();
  });
});
