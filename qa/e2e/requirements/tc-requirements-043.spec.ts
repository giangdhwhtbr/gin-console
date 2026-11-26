// TC: TC-REQUIREMENTS-043@8ebb4796
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-043: Row (REQ-REQUIREMENTS-013)', async ({ page, ev }) => {
  // Precondition: an untested requirement has two closed beads, one passed case and one outdated case.
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([
      requirement('REQ-AUTH-001', {
        title: 'Lock out', status: 'untested', reasons: ['outdated'],
        beads: [{ id: 'a-1', title: 'One', status: 'closed' }, { id: 'a-2', title: 'Two', status: 'closed' }],
        cases: [{ id: 'TC-AUTH-001', effective_result: 'passed' }, { id: 'TC-AUTH-002', effective_result: 'outdated' }],
      }),
    ]),
  });

  await ev.step('1. Open `/requirements/matrix?project=a`', async () => {
    await page.goto('/requirements/matrix?project=a');
    await expect(page.getByRole('heading', { name: 'auth', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Untested 1' })).toBeVisible();
    const row = page.getByRole('row', { name: /REQ-AUTH-001/ });
    await expect(row.getByRole('cell')).toHaveText(['REQ-AUTH-001', 'Lock out', 'Untested, outdated', 'None', '2/2', '1/2']);
  });
});
