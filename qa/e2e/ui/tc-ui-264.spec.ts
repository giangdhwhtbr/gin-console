// TC: TC-UI-264@c49bbbcf
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-264: Group by assignee rows', async ({ page, ev }) => {
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('b-1', { title: 'Bob task', status: 'in_progress', assignee: 'bob' }),
      bead('b-2', { title: 'Alice task', status: 'in_progress', assignee: 'alice' }),
      bead('b-3', { title: 'Nobody task', status: 'open', ready: true, priority: 1 }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=focus', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=focus');
  });

  await ev.step('2. Choose Group by "Assignee"', async () => {
    await page.getByLabel('Group by').selectOption('Assignee');
    await expect(page).toHaveURL(/group=assignee/);
    const rows = page.getByRole('region').filter({ has: page.getByRole('heading', { level: 2, name: /^(alice|bob|Unassigned)$/ }) });
    await expect(rows.locator('> h2')).toHaveText(['alice', 'bob', 'Unassigned']);
    for (const name of ['alice', 'bob', 'Unassigned']) {
      const row = page.getByRole('region', { name, exact: true });
      for (const column of ['In flight', 'Blocked', 'Next up']) {
        await expect(row.getByRole('region', { name: column })).toBeVisible();
      }
    }
  });
});
