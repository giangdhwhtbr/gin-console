// TC: TC-REQUIREMENTS-046@e97b7208
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-046: Shared link (REQ-REQUIREMENTS-014)', async ({ page, ev }) => {
  // Precondition: untested and covered requirements of the capabilities ui and server.
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([
      requirement('REQ-UI-001', { status: 'untested' }),
      requirement('REQ-UI-002', { status: 'covered' }),
      requirement('REQ-SERVER-001', { status: 'untested' }),
    ]),
  });

  await ev.step('1. Open `/requirements/matrix?project=a&status=untested&capability=ui`', async () => {
    await page.goto('/requirements/matrix?project=a&status=untested&capability=ui');
    await expect(page.getByRole('row', { name: /REQ-UI-001/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /REQ-UI-002/ })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /REQ-SERVER-001/ })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: /^Status/ })).toHaveValue('untested');
    await expect(page.getByRole('combobox', { name: /^Capability/ })).toHaveValue('ui');
  });
});
