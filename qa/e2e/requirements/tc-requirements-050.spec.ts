// TC: TC-REQUIREMENTS-050@f4e27383
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-050: Unknown requirement (REQ-REQUIREMENTS-015)', async ({ page, ev }) => {
  // Precondition: there is no requirement REQ-NOPE-001.
  await stubRequirements(page, { projects: ['a'], list: requirementList([requirement('REQ-AUTH-001')]) });

  await ev.step('1. Open `/requirements/matrix?project=a&req=REQ-NOPE-001`', async () => {
    await page.goto('/requirements/matrix?project=a&req=REQ-NOPE-001');
    await expect(page.getByRole('complementary', { name: 'REQ-NOPE-001' }).getByText('Requirement REQ-NOPE-001 was not found')).toBeVisible();
    await expect(page.getByRole('row', { name: /REQ-AUTH-001/ })).toBeVisible();
  });
});
