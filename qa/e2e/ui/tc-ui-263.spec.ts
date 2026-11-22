// TC: TC-UI-263@afa30ebf
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-263: Focus in progress and blocked', async ({ page, ev }) => {
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('t-1', { title: 'Working task', status: 'in_progress', blocked: true, blocked_by: ['t-9'], dependency_count: 1 }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=focus', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=focus');
    await expect(page.getByRole('region', { name: 'Blocked' }).getByText('t-1')).toBeVisible();
    const inFlight = page.getByRole('region', { name: 'In flight' });
    await expect(inFlight).toBeVisible();
    await expect(inFlight.getByText('t-1')).toHaveCount(0);
  });
});
