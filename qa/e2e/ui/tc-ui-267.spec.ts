// TC: TC-UI-267@0efecc8f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-267: Filter by multiple assignees', async ({ page, ev }) => {
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('b-1', { title: 'Alice task', status: 'open', assignee: 'alice@example.com' }),
      bead('b-2', { title: 'Bob task', status: 'open', assignee: 'bob@example.com' }),
      bead('b-3', { title: 'Carol task', status: 'open', assignee: 'carol@example.com' }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=list', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
  });

  await ev.step('2. Open the "Assignee" filter', async () => {
    await page.getByRole('button', { name: 'Assignee' }).click();
  });

  const tree = page.getByRole('tree', { name: 'Beads of alpha' });

  await ev.step('3. Select alice', async () => {
    await page.getByRole('checkbox', { name: 'alice', exact: true }).check();
    await expect(tree.getByRole('treeitem')).toHaveCount(1);
    await expect(tree.getByRole('link', { name: 'Alice task' })).toBeVisible();
  });

  await ev.step('4. Select bob', async () => {
    await page.getByRole('checkbox', { name: 'bob', exact: true }).check();
    await expect(tree.getByRole('treeitem')).toHaveCount(2);
    await expect(tree.getByRole('link', { name: 'Alice task' })).toBeVisible();
    await expect(tree.getByRole('link', { name: 'Bob task' })).toBeVisible();
    await expect(tree.getByRole('link', { name: 'Carol task' })).toHaveCount(0);
    await expect(page).toHaveURL(/[?&]assignee=alice(,|%2C)bob(&|$)/);
  });
});
