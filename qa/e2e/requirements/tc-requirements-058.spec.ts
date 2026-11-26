// TC: TC-REQUIREMENTS-058@98b6a532
import { test, expect } from '../evidence';
import { requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-058: Legacy (REQ-REQUIREMENTS-019)', async ({ page, ev }) => {
  // Precondition: the trace of project a has the layout legacy.
  await stubRequirements(page, { projects: ['a'], list: requirementList([], { layout: 'legacy' }), changes: { changes: [], error: null, cause: null }, });
  const legacy = 'This project uses the legacy layout, which has no requirement ids.';

  await ev.step('1. Open `/requirements/matrix?project=a`', async () => {
    await page.goto('/requirements/matrix?project=a');
    await expect(page.getByRole('main').getByText(legacy)).toBeVisible();
  });

  await ev.step('2. Open `/requirements/changes?project=a`', async () => {
    await page.goto('/requirements/changes?project=a');
    await expect(page.getByRole('main').getByText(legacy)).toBeVisible();
  });
});
