// TC: TC-UI-220@972e8ff7
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProject } from '../support/graph';

test('TC-UI-220: Bead without children or parent (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: project p has task z without a parent and without children.
  await stubProject(page, 'p', [bead('z')]);

  await ev.step('1. Open `/beads/p/z/graph`', async () => {
    await page.goto('/beads/p/z/graph');
    await expect(page).toHaveURL(/\/beads\?project=p&view=graph&select=z$/);
    // the Graph view is shown; `z` has no relation, so "Only linked" does not draw it and nothing is selected (see the report of gin-console-atl.6)
    await expect(page.getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'true');
  });
});
