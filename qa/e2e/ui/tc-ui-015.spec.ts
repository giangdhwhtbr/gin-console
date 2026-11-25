// TC: TC-UI-015@c56eb3ae
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-015: My work does not request the full projects list', async ({ page, ev }) => {
  // Preconditions: two projects in /api/projects/beads.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubApi(page, { projects: ['A', 'B'], beads: [bead('a-1', { title: 'Task of A', ready: true, assignee: 'qa@example.com' })] });

  await ev.step('1. Open /my-tasks', async () => {
    await page.goto('/my-tasks');
    await expect(page.getByRole('link', { name: /Task of A/ })).toBeVisible();
    expect(stub.calls.filter((u) => u.pathname === '/api/projects')).toHaveLength(0);
  });
});
