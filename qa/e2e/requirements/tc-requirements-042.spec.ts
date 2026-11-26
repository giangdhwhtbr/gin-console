// TC: TC-REQUIREMENTS-042@4d4250c8
import { test, expect } from '../evidence';
import { stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-042: Unknown section (REQ-REQUIREMENTS-012)', async ({ page, ev }) => {
  // Precondition: project a is configured.
  await stubRequirements(page, { projects: ['a'] });

  await ev.step('1. Open `/requirements/nope`', async () => {
    await page.goto('/requirements/nope');
    await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
    await expect(page.getByRole('main').getByText('/requirements/nope')).toBeVisible();
  });
});
