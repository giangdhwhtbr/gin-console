// TC: TC-UI-099@11ae7f02
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-099: Off inside a bead', async ({ page, ev }) => {
  // Precondition: epic e-1 has an unlinked task.
  await stubApi(page, {
    projects: ['p'],
    beads: [
      bead('e-1', { issue_type: 'epic' }),
      bead('e-1.1', { title: 'Lonely task', parent: 'e-1' }),
    ],
  });

  await ev.step('1. Open /beads/p/e-1/graph', async () => {
    await page.goto('/beads/p/e-1/graph');
    await expect(page.getByRole('button', { name: /^e-1\.1/ })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Only linked' })).not.toBeChecked();
  });
});
