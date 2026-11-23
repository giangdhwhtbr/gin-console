// TC: TC-UI-012@27c5f9e2
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-012: My Tasks lists the current project in order', async ({ page, ev }) => {
  // Preconditions: A has a P2 bead updated today and a P1 bead updated last week, both mine; B has a bead of mine; A is current.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const now = new Date().toISOString();
  const week = new Date(Date.now() - 7 * 86400000).toISOString();
  const byProject = {
    A: [
      bead('a-2', { title: 'Newer P2', priority: 2, assignee: 'qa@example.com', updated_at: now }),
      bead('a-1', { title: 'Older P1', priority: 1, assignee: 'qa@example.com', updated_at: week }),
    ],
    B: [bead('b-1', { title: 'Task of B', assignee: 'qa@example.com' })],
  };
  const stub = await stubApi(page, { projects: ['A', 'B'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    const rows = page.getByRole('row');
    await expect(rows.nth(1)).toContainText('Older P1');
    await expect(rows.nth(2)).toContainText('Newer P2');
    await expect(page.getByRole('columnheader', { name: 'Project' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Task of B/ })).toHaveCount(0);
    expect(stub.calls.filter((u) => u.pathname === '/api/beads' && u.searchParams.get('project') === 'B')).toHaveLength(0);
  });

  await ev.step('2. Click the P2 bead', async () => {
    await page.getByRole('link', { name: /Newer P2/ }).click();
    await expect(page).toHaveURL((u) => u.pathname === '/beads/A/a-2');
  });
});
