// TC: TC-UI-261@6733ce7f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-261: Board empty column', async ({ page, ev }) => {
  // Precondition: project alpha has beads but none of them is blocked.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('b-1', { title: 'Working task', status: 'in_progress' }),
      bead('b-2', { title: 'Open task', status: 'open' }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=board', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const blocked = page.getByRole('region', { name: 'Blocked' });
    await expect(blocked).toBeVisible();
    await expect(blocked.getByText('No beads')).toBeVisible();
  });
});
