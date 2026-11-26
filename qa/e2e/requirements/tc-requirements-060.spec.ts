// TC: TC-REQUIREMENTS-060@4d9b64b4
import { test, expect } from '../evidence';
import { stubRequirements, gone } from '../support/requirements';

test('TC-REQUIREMENTS-060: Old gin (REQ-REQUIREMENTS-019)', async ({ page, ev }) => {
  // Precondition: the requirements request answers 502 with the cause outdated.
  await stubRequirements(page, { projects: ['a'], list: gone('gin has no specs trace --all', 'outdated') });

  await ev.step('1. Open `/requirements/matrix?project=a`', async () => {
    await page.goto('/requirements/matrix?project=a');
    await expect(page.getByText('Requirements need a newer gin')).toBeVisible();
    await expect(page.getByText('gin-workflow/install.sh')).toBeVisible();
  });
});
