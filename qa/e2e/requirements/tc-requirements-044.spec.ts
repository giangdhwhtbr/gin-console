// TC: TC-REQUIREMENTS-044@6837f0dc
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-044: Beads unknown (REQ-REQUIREMENTS-013)', async ({ page, ev }) => {
  // Precondition: the trace has null beads.
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([requirement('REQ-AUTH-001', { beads: null, cases: [{ id: 'TC-AUTH-001', effective_result: 'passed' }] })], { warnings: ['beads: bd exited 1'] }),
  });

  await ev.step('1. Open `/requirements/matrix?project=a`', async () => {
    await page.goto('/requirements/matrix?project=a');
    const cells = page.getByRole('row', { name: /REQ-AUTH-001/ }).getByRole('cell');
    await expect(cells.nth(4)).toHaveText('unknown');
    await expect(cells.nth(5)).toHaveText('1/1');
  });
});
