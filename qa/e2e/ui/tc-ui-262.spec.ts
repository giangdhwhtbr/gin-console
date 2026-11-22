// TC: TC-UI-262@a4cd906f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-262: Focus columns', async ({ page, ev }) => {
  // Precondition: alpha has an in-progress bead, a blocked bead, a ready P1 bead and a ready P3 bead.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('f-1', { title: 'Working task', status: 'in_progress', priority: 2 }),
      bead('f-2', { title: 'Blocked task', blocked: true, blocked_by: ['f-9'], dependency_count: 1 }),
      bead('f-3', { title: 'Ready P1 task', ready: true, priority: 1 }),
      bead('f-4', { title: 'Ready P3 task', ready: true, priority: 3 }),
    ],
  });

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=focus`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=focus');
    const held: [string, string][] = [['In flight', 'f-1'], ['Blocked', 'f-2'], ['Next up', 'f-3']];
    for (const [name, id] of held) {
      const column = page.getByRole('region', { name });
      await expect(column.getByRole('listitem')).toHaveCount(1);
      await expect(column.getByText(id)).toBeVisible();
    }
    await expect(page.getByText('f-4')).toHaveCount(0);
  });
});
