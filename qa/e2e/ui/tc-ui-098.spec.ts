// TC: TC-UI-098@6e87a2b1
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-098: Only linked on the project page (REQ-UI-081)', async ({ page, ev }) => {
  // Precondition: r-1 depends on r-2, and 5 other beads without a parent and without arrows.
  await stubApi(page, {
    projects: ['p'],
    beads: [
      bead('r-1', { blocked_by: ['r-2'], dependency_count: 1, blocked: true }),
      bead('r-2', { dependent_count: 1 }),
      ...['o-1', 'o-2', 'o-3', 'o-4', 'o-5'].map((id) => bead(id)),
    ],
  });

  await ev.step('1. Open `/beads?project=p&milestone=all&view=graph`', async () => {
    await page.goto('/beads?project=p&milestone=all&view=graph');
    await expect(page.locator('[data-node="r-1"]')).toBeVisible();
    await expect(page.locator('[data-node="r-2"]')).toBeVisible();
    await expect(page.getByText('5 without dependencies')).toBeVisible();
  });
});
