// TC: TC-UI-256@a2d84da4
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-256: Board placement', async ({ page, ev }) => {
  // Precondition: alpha has a deferred, a ready, an in-progress, a blocked and a closed bead, none a prep task.
  const byProject = {
    alpha: [
      bead('a-1', { status: 'deferred' }),
      bead('a-2', { ready: true }),
      bead('a-3', { status: 'in_progress' }),
      bead('a-4', { blocked: true, blocked_by: ['a-2'] }),
      bead('a-5', { status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
    ],
  };
  await stubApi(page, { projects: ['alpha'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);
  const columns: [string, string][] = [
    ['Backlog', 'a-1'], ['Ready', 'a-2'], ['In Progress', 'a-3'], ['Blocked', 'a-4'], ['Done', 'a-5'],
  ];

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    await expect(page.getByRole('region', { name: 'Ready' }).getByText('Title a-2')).toBeVisible();
  });

  await ev.step('2. Turn on "Show closed"', async () => {
    await page.getByRole('switch', { name: /Show closed/ }).check();
    for (const [name, id] of columns) {
      const column = page.getByRole('region', { name });
      await expect(column.getByText(`Title ${id}`)).toBeVisible();
      await expect(column.getByRole('link')).toHaveCount(1);
      await expect(column.getByRole('heading', { name })).toContainText('1');
    }
  });
});
