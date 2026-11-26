// TC: TC-UI-412@be0b67f5
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { requirement, requirementList, stubRequirements } from '../support/requirements';
import { mainNav, stubBeadPages } from '../support/shell';

test('TC-UI-412: Bead page from Requirements (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: project a has the requirement REQ-AUTH-001 with the bead a-1.
  const byProject = { a: [bead('a-1', { title: 'Lock the account' })] };
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([requirement('REQ-AUTH-001', { beads: [{ id: 'a-1', title: 'Lock the account', status: 'open' }] })]),
    scenarios: { 'REQ-AUTH-001': { id: 'REQ-AUTH-001', title: 'Lock out', source: null, scenarios: [] } },
  });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/requirements/matrix?project=a&req=REQ-AUTH-001`', async () => {
    await page.goto('/requirements/matrix?project=a&req=REQ-AUTH-001');
    await expect(page.getByRole('complementary', { name: 'REQ-AUTH-001' })).toBeVisible();
  });

  await ev.step('2. Choose the bead `a-1` in the panel', async () => {
    await page.getByRole('complementary', { name: 'REQ-AUTH-001' }).getByRole('link', { name: /Lock the account/ }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    const nav = mainNav(page);
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Requirements', exact: true })).toHaveAttribute('aria-current', 'page');
  });
});
