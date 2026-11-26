// TC: TC-REQUIREMENTS-047@f06f1432
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-047: No match (REQ-REQUIREMENTS-014)', async ({ page, ev }) => {
  // Precondition: several requirements are listed.
  await stubRequirements(page, { projects: ['a'], list: requirementList([requirement('REQ-UI-001'), requirement('REQ-UI-002')]) });

  await ev.step('1. Open `/requirements/matrix?project=a`', async () => {
    await page.goto('/requirements/matrix?project=a');
    await expect(page.getByRole('row', { name: /REQ-UI-001/ })).toBeVisible();
  });

  await ev.step('2. Type `zzzz` into "Search"', async () => {
    await page.getByLabel('Search').fill('zzzz');
    await expect(page.getByText('No requirements match')).toBeVisible();
    await expect(page).toHaveURL(/q=zzzz/);
  });

  await ev.step('3. Choose "Clear filters"', async () => {
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('row', { name: /REQ-UI-001/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /REQ-UI-002/ })).toBeVisible();
  });
});
