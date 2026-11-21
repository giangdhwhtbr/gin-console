// TC: TC-UI-208@2a0e80c8
import { test, expect } from '../evidence';
import { epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-208: Selection kept (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: project p has epic e-1 with child b.
  await stubProject(page, 'p', [epicOf('e-1'), taskOf('b', 'e-1')]);

  await ev.step('1. Open `/beads/p/e-1/graph?select=b`', async () => {
    await page.goto('/beads/p/e-1/graph?select=b');
    await expect(page).toHaveURL(/\/beads\/p\/e-1\?.*tab=graph/);
    await expect(page).toHaveURL(/select=b/);
    await expect(nodeOf(page, 'b')).toHaveAttribute('aria-pressed', 'true');
  });
});
