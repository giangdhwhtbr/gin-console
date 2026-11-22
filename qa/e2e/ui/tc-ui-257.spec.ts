// TC: TC-UI-257@ed55e500
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-257: Board blocked first', async ({ page, ev }) => {
  // Precondition: in-progress bead b-1 and deferred bead b-2, each with an open blocker.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('b-1', { title: 'Working task', status: 'in_progress', blocked: true, blocked_by: ['b-9'], dependency_count: 1 }),
      bead('b-2', { title: 'Deferred task', status: 'deferred', blocked: true, blocked_by: ['b-9'], dependency_count: 1 }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=board', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const blocked = page.getByRole('region', { name: 'Blocked' });
    await expect(blocked.getByText('b-1')).toBeVisible();
    await expect(blocked.getByText('b-2')).toBeVisible();
    for (const name of ['In Progress', 'Backlog']) {
      const column = page.getByRole('region', { name });
      await expect(column).toBeVisible();
      await expect(column.getByText('b-1')).toHaveCount(0);
      await expect(column.getByText('b-2')).toHaveCount(0);
    }
  });
});
