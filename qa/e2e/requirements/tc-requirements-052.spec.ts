// TC: TC-REQUIREMENTS-052@0d909cd2
import { test, expect } from '../evidence';
import { changeRow, signoff, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-052: Trace failed (REQ-REQUIREMENTS-016)', async ({ page, ev }) => {
  // Precondition: the list of changes has the trace error.
  await stubRequirements(page, {
    projects: ['a'],
    changes: { changes: [changeRow('e1-login', { title: 'Login change', signoff: null, added: null, modified: null, removed: null })], error: 'bd exited 1', cause: null },
  });

  await ev.step('1. Open `/requirements/changes?project=a`', async () => {
    await page.goto('/requirements/changes?project=a');
    const main = page.getByRole('main');
    await expect(main.getByRole('listitem').filter({ hasText: 'Login change' })).toContainText('Sign-off: Unknown');
    await expect(main.getByText('bd exited 1')).toBeVisible();
  });
});
