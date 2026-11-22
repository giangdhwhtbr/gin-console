// TC: TC-UI-265@999f80bd
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-265: Group by assignee one row per person', async ({ page, ev }) => {
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('b-1', { title: 'Handle task', status: 'in_progress', assignee: 'ann' }),
      bead('b-2', { title: 'Email task', status: 'in_progress', assignee: 'ann@example.com' }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=focus', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=focus');
  });

  await ev.step('2. Choose Group by "Assignee"', async () => {
    await page.getByRole('combobox', { name: 'Group by' }).selectOption('assignee');
    await expect(page.getByRole('combobox', { name: 'Group by' })).toHaveValue('assignee');
    const ann = page.getByRole('region', { name: 'ann', exact: true });
    await expect(ann.getByRole('link', { name: 'Handle task' })).toBeVisible();
    await expect(ann.getByRole('link', { name: 'Email task' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'ann@example.com' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /ann@example\.com/ })).toHaveCount(0);
  });
});
