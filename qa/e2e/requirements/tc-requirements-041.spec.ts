// TC: TC-REQUIREMENTS-041@0fe7e080
import { test, expect } from '../evidence';
import { stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-041: Redirect (REQ-REQUIREMENTS-012)', async ({ page, ev }) => {
  // Precondition: the current project is a.
  await stubRequirements(page, { projects: ['a'] });

  await ev.step('1. Open `/my-tasks?project=a`', async () => {
    await page.goto('/my-tasks?project=a');
    await expect(page.getByRole('heading', { name: 'My work', level: 1 })).toBeVisible();
  });

  await ev.step('2. Choose "Requirements" in the "Main" navigation', async () => {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Requirements', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/requirements/matrix?project=a');
  });

  await ev.step('3. Go back in the browser history', async () => {
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/my-tasks?project=a');
  });
});
