// TC: TC-UI-268@792c263d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-268: Filter unassigned beads', async ({ page, ev }) => {
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('b-1', { title: 'Alice task', assignee: 'alice@example.com' }),
      bead('b-2', { title: 'Nobody task' }),
      bead('b-3', { title: 'Owned task', owner: 'lead@example.com' }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=list', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
  });

  await ev.step('2. Open the "Assignee" filter', async () => {
    await page.getByRole('button', { name: 'Assignee' }).click();
    await expect(page.getByRole('checkbox', { name: 'Unassigned' })).toBeVisible();
  });

  await ev.step('3. Select "Unassigned"', async () => {
    await page.getByRole('checkbox', { name: 'Unassigned' }).click();
    await expect(page).toHaveURL(/assignee=unassigned/);
    await page.keyboard.press('Escape');
    await expect(page.getByText('Nobody task')).toBeVisible();
    await expect(page.getByText('Owned task')).toBeVisible();
    await expect(page.getByText('Alice task')).toHaveCount(0);
  });
});
