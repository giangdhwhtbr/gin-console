// TC: TC-UI-266@54b2566f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-266: Group by assignee back to none', async ({ page, ev }) => {
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('b-1', { title: 'Alice task', status: 'in_progress', assignee: 'alice' }),
      bead('b-2', { title: 'Bob task', status: 'in_progress', assignee: 'bob' }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=focus&group=assignee', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=focus&group=assignee');
  });

  await ev.step('2. Choose Group by "None"', async () => {
    await expect(page.getByRole('region', { name: 'alice' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Group by' }).selectOption({ label: 'None' });
    await expect(page.getByRole('region', { name: 'In flight' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Blocked' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Next up' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'alice' })).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]group=/);
  });
});
