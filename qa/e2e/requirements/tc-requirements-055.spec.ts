// TC: TC-REQUIREMENTS-055@eeffc5eb
import { test, expect } from '../evidence';
import { stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-055: Unknown change (REQ-REQUIREMENTS-017)', async ({ page, ev }) => {
  // Precondition: there is no change named nope.
  await stubRequirements(page, { projects: ['a'] });

  await ev.step('1. Open `/requirements/changes/nope?project=a`', async () => {
    await page.goto('/requirements/changes/nope?project=a');
    await expect(page.getByRole('heading', { name: 'Change nope was not found' })).toBeVisible();
  });

  await ev.step('2. Choose the link "Changes"', async () => {
    const link = page.getByRole('main').getByRole('link', { name: 'Changes', exact: true });
    await expect(link).toHaveAttribute('href', '/requirements/changes?project=a');
    await link.click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/requirements/changes?project=a');
  });
});
