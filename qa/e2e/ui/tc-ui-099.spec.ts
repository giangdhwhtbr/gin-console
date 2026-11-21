// TC: TC-UI-099@1d6ced06
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-099: Off inside a bead (REQ-UI-081)', async ({ page, ev }) => {
  // Precondition: epic e-1 has an unlinked task.
  await stubApi(page, {
    projects: ['p'],
    beads: [
      bead('e-1', { issue_type: 'epic' }),
      bead('e-1.1', { title: 'Lonely task', parent: 'e-1' }),
    ],
  });

  await ev.step('1. Open /beads?project=p&milestone=all&view=graph&scope=e-1', async () => {
    await page.goto('/beads?project=p&milestone=all&view=graph&scope=e-1');
    await expect(page.getByRole('button', { name: /^e-1\.1/ })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Only linked' })).not.toBeChecked();
  });
});
