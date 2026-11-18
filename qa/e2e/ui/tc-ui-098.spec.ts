// TC: TC-UI-098@fb9c569b
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-098: Only linked on the project page', async ({ page, ev }) => {
  // Precondition: r-1 depends on r-2, and 5 other beads without a parent and without arrows.
  await stubApi(page, {
    projects: ['p'],
    beads: [
      bead('r-1', { blocked_by: ['r-2'], dependency_count: 1, blocked: true }),
      bead('r-2', { dependent_count: 1 }),
      ...['o-1', 'o-2', 'o-3', 'o-4', 'o-5'].map((id) => bead(id)),
    ],
  });

  await ev.step('1. Open `/beads/p/graph`', async () => {
    await page.goto('/beads/p/graph');
    await expect(page.locator('[data-node="r-1"]')).toBeVisible();
    await expect(page.locator('[data-node="r-2"]')).toBeVisible();
    await expect(page.getByText('5 without dependencies')).toBeVisible();
  });
});
