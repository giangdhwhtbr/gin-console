// TC: TC-REQUIREMENTS-059@f3ba57e2
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-059: Warning (REQ-REQUIREMENTS-019)', async ({ page, ev }) => {
  // Precondition: the trace has the warning `beads: bd exited 1`.
  await stubRequirements(page, { projects: ['a'], list: requirementList([requirement('REQ-AUTH-001')], { warnings: ['beads: bd exited 1'] }) });

  await ev.step('1. Open `/requirements/matrix?project=a`', async () => {
    await page.goto('/requirements/matrix?project=a');
    const warning = page.getByRole('status').filter({ hasText: 'beads: bd exited 1' });
    await expect(warning).toBeVisible();
    const above = await warning.boundingBox();
    const table = await page.getByRole('table').boundingBox();
    expect(above !== null && table !== null && above.y + above.height <= table.y).toBe(true);
  });
});
