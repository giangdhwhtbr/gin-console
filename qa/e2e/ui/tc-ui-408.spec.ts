// TC: TC-UI-408@ee5fb148
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { requirement, requirementList, stubRequirements } from '../support/requirements';
import { stubBeadPages } from '../support/shell';

test('TC-UI-408: From Requirements (REQ-UI-072)', async ({ page, ev }) => {
  // Precondition: REQ-AUTH-001 is untested and has the bead a-1.
  const byProject = { a: [bead('a-1', { title: 'Lock the account' })] };
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([requirement('REQ-AUTH-001', { status: 'untested', reasons: ['no case'], beads: [{ id: 'a-1', title: 'Lock the account', status: 'open' }] })]),
    scenarios: { 'REQ-AUTH-001': { id: 'REQ-AUTH-001', title: 'Lock out', source: null, scenarios: [] } },
  });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/requirements/matrix?project=a&status=untested&req=REQ-AUTH-001`', async () => {
    await page.goto('/requirements/matrix?project=a&status=untested&req=REQ-AUTH-001');
    await expect(page.getByRole('complementary', { name: 'REQ-AUTH-001' })).toBeVisible();
  });

  await ev.step('2. Open the bead `a-1` from the panel', async () => {
    await page.getByRole('complementary', { name: 'REQ-AUTH-001' }).getByRole('link', { name: /Lock the account/ }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumb.getByRole('listitem')).toContainText(['Requirements', 'Lock the account']);
    await expect(crumb.getByRole('link', { name: 'Requirements' })).toHaveAttribute('href', '/requirements/matrix?project=a&status=untested&req=REQ-AUTH-001');
    await expect(crumb.locator('[aria-current="page"]')).toHaveText('Lock the account');
  });
});
