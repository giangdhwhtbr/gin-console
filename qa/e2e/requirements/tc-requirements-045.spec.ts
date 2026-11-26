// TC: TC-REQUIREMENTS-045@0a67080f
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-045: Removed (REQ-REQUIREMENTS-013)', async ({ page, ev }) => {
  // Precondition: one requirement is removed.
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([
      requirement('REQ-AUTH-001'),
      requirement('REQ-AUTH-002', { state: 'removed', status: null }),
    ]),
  });

  await ev.step('1. Open `/requirements/matrix?project=a`', async () => {
    await page.goto('/requirements/matrix?project=a');
    await expect(page.getByRole('row', { name: /REQ-AUTH-001/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /REQ-AUTH-002/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Covered 1' })).toBeVisible();
  });

  await ev.step('2. Turn on "Show removed"', async () => {
    await page.getByRole('checkbox', { name: 'Show removed' }).check();
    await expect(page.getByRole('row', { name: /REQ-AUTH-002/ }).getByRole('cell').nth(2)).toHaveText('Removed');
    await expect(page.getByRole('button', { name: 'Covered 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Untested 0' })).toBeVisible();
  });
});
